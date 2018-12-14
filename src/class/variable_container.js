/**
 * @fileoverview Variable container for variable object
 */
'use strict';

/**
 * Block variable constructor
 * @param {variable model} variable
 * @constructor
 */
Entry.VariableContainer = class VariableContainer {
    constructor() {
        this.variables_ = [];
        this.messages_ = [];
        this.lists_ = [];
        this.functions_ = {};
        this.viewMode_ = 'all';
        this.selected = null;
        this.variableAddPanel = {
            isOpen: false,
            info: {
                object: null,
                isCloud: false,
            },
        };
        this.listAddPanel = {
            isOpen: false,
            info: {
                object: null,
                isCloud: false,
            },
        };
        this.messageAddPanel = {
            isOpen: false,
            info: {
                object: null,
                isCloud: false,
            },
        };
        this.selectedVariable = null;
        this._variableRefs = [];
        this._messageRefs = [];
        this._functionRefs = [];
        this._filterTabs = {};
        this.listView_ = null;

        Entry.addEventListener('workspaceChangeMode', this.updateList.bind(this));
    }

    createDom(view) {
        const createElement = Entry.createElement;
        const that = this;

        this.filterElements = {};
        this.view_ = view;
        const selectView = createElement('table')
            .addClass('entryVariableSelectorWorkspace')
            .appendTo(this.view_);

        $(selectView).on('click tab', 'td', function() {
            if (this.disabled) {
                return;
            }

            Entry.do(
                'variableContainerSelectFilter',
                this.getAttribute('data-type'),
                that.viewMode_
            );
        });

        let selectTrView = createElement('tr').appendTo(selectView);

        const allButton = this.createSelectButton('all')
            .addClass('selected', 'allButton')
            .appendTo(selectTrView);
        this.filterElements.all = allButton;

        allButton.setAttribute('rowspan', '2');
        this.filterElements.variable = this.createSelectButton(
            'variable',
            Entry.variableEnable
        ).appendTo(selectTrView);
        this.filterElements.message = this.createSelectButton(
            'message',
            Entry.messageEnable
        ).appendTo(selectTrView);

        selectTrView = createElement('tr').appendTo(selectView);
        this.filterElements.list = this.createSelectButton('list', Entry.listEnable).appendTo(
            selectTrView
        );
        this.filterElements.func = this.createSelectButton('func', Entry.functionEnable).appendTo(
            selectTrView
        );

        const listViewContainer = createElement('div').addClass('entryVariableListWorkspace');
        const listView = createElement('div').addClass('entryVariableAdd_box');

        $(listView).on('mouseenter', '.entryVariableListElementWorkspace', function() {
            this.addClass('active');
        });

        $(listView).on('mouseleave', '.entryVariableListElementWorkspace', function() {
            this.removeClass('active');
        });

        listViewContainer.appendChild(listView);
        this.view_.appendChild(listViewContainer);
        this.listView_ = listView;

        this.generateAddButtons();

        this.generateVariableAddView();
        this.generateListAddView();
        this.generateMessageAddView();

        return view;
    }

    generateAddButtons() {
        const createElement = Entry.createElement;
        const variableAddButton = createElement('a').addClass('entryVariableAddWorkspace');
        variableAddButton.innerHTML = Lang.Workspace.variable_add;
        variableAddButton.href = '#';
        this.variableAddButton_ = variableAddButton;

        const messageAddButton = createElement('a').addClass('entryVariableAddWorkspace');
        messageAddButton.innerHTML = Lang.Workspace.message_create;
        messageAddButton.href = '#';
        this.messageAddButton_ = messageAddButton;

        const listAddButton = createElement('a').addClass('entryVariableAddWorkspace');
        listAddButton.innerHTML = Lang.Workspace.list_create;
        listAddButton.href = '#';
        this.listAddButton_ = listAddButton;

        const functionAddButton = createElement('a').addClass('entryVariableAddWorkspace');
        functionAddButton.innerHTML = Lang.Workspace.function_add;
        functionAddButton.href = '#';
        this.functionAddButton_ = functionAddButton;
    }

    /**
     * @param {String} type
     * @param {?Boolean} isEnable
     */
    createSelectButton(type, isEnable = true) {
        const view = Entry.createElement('td').addClass('entryVariableSelectButtonWorkspace', type);
        const textView = Entry.createElement('div');

        view.setAttribute('data-type', type);
        view.appendChild(textView);
        textView.innerText = Lang.Workspace[type];

        if (isEnable === false) {
            view.addClass('disabled');
            view.disabled = true;
        }

        this._filterTabs[type] = view;
        return view;
    }

    /**
     * @param {String} type
     */
    selectFilter(type) {
        _.each(this.view_.getElementsByTagName('td'), (elem) => {
            if (elem.hasClass(type)) {
                elem.addClass('selected');
            } else {
                elem.removeClass('selected');
            }
        });
        this.viewMode_ = type;
        this.select();
        this.updateList();
    }

    updateVariableAddView(type = 'variable') {
        const { info: { isCloud, object }, view } = this._getAddPanel(type);
        const { cloudCheck, globalCheck, localCheck, cloudWrapper } = view;

        if (isCloud) {
            cloudCheck.addClass('on');
        } else {
            cloudCheck.removeClass('on');
        }

        if (object) {
            globalCheck.removeClass('on');
            localCheck.addClass('on');
            cloudWrapper.addClass('entryVariableAddSpaceUnCheckedWorkspace');
        } else {
            globalCheck.addClass('on');
            localCheck.removeClass('on');
            cloudWrapper.removeClass('entryVariableAddSpaceUnCheckedWorkspace');
        }
    }

    /**
     * @param {object|Entry.Variable} object
     */
    select(object) {
        object = this.selected == object ? null : object;
        if (this.selected) {
            this.selected.listElement.removeClass('unfold');
            this.selected.listElement.addClass('fold');
            this.selected.listElement.removeClass('selected');
            if (this.selected.callerListElement) {
                $(this.selected.callerListElement).remove();
                delete this.selected.callerListElement;
            }
            this.selected = null;
        }
        if (!object) {
            return;
        }
        object.listElement.addClass('selected');
        this.selected = object;
        this.selected.listElement.removeClass('fold');
        this.selected.listElement.addClass('unfold');
        if (object instanceof Entry.Variable) {
            if (object.type === 'variable') {
                this.generateVariableSettingView();
                this.renderVariableReference(object);
            } else if (object.type === 'list') {
                this.generateListSettingView();
                this.renderVariableReference(object);
            }
            if (object.object_) {
                Entry.container.selectObject(object.object_, true);
            }
        } else if (object instanceof Entry.Func) {
            this.renderFunctionReference(object);
        } else {
            this.renderMessageReference(object);
        }
    }

    getMessage(id) {
        return _.find(this.messages_, { id });
    }

    /**
     * @param {object} message
     */
    renderMessageReference(message) {
        const messageId = message.id;

        const callers = this._messageRefs.filter(({ block: { params } }) => {
            return _.includes(params, messageId);
        });

        message.usedView && $(message.usedView).remove();
        let usedWrapper;

        if (callers.length) {
            usedWrapper = Entry.createElement('div').addClass('use_block');
            const listView = Entry.createElement('ul')
                .addClass('obj_list')
                .appendTo(usedWrapper);
            const fragment = document.createDocumentFragment();
            callers.forEach((caller) => {
                const element = Entry.createElement('li');
                !caller.object.thumbnailView_ && caller.object.generateView();
                const thumb = element.appendChild(caller.object.thumbnailView_.cloneNode());
                thumb.addClass('thmb');
                element.appendChild(thumb);
                Entry.createElement('span')
                    .addClass('text')
                    .appendTo(element).innerHTML = `${caller.object.name} : ${
                        Lang.Blocks[`START_${caller.block.type}`]
                    }`;
                element.bindOnClick((e) => {
                    e.stopPropagation();
                    if (Entry.playground.object !== caller.object) {
                        Entry.container.selectObject();
                        Entry.container.selectObject(caller.object.id, true);
                    }
                    const block = caller.funcBlock || caller.block;
                    const board = _.result(block.view, 'getBoard');
                    if (board) {
                        board.activateBlock(block);
                    }
                    Entry.playground.toggleOnVariableView();
                    Entry.playground.changeViewMode('variable');
                });
                fragment.appendChild(element);
            });
            listView.appendChild(fragment);
        } else {
            usedWrapper = Entry.createElement('p').addClass('caution_dsc');
            usedWrapper.innerHTML = Lang.Workspace.no_use;
        }
        message.usedView = usedWrapper;
        message.listElement.appendChild(usedWrapper);
    }

    /**
     * @param {object} variable
     */
    renderVariableReference(variable) {
        const that = this;
        const variableId = variable.id_;

        const callers = this._variableRefs.filter(({ block: { params } }) => {
            return _.includes(params, variableId);
        });

        const usedWrapper = Entry.createElement('div').addClass('use_obj');
        const usedSubject = Entry.createElement('span')
            .addClass('box_sjt')
            .appendTo(usedWrapper);
        usedSubject.innerHTML = '사용된 오브젝트';
        const listView = Entry.createElement('ul')
            .addClass('obj_list')
            .appendTo(usedWrapper);

        if (callers.length) {
            const fragment = document.createDocumentFragment();

            callers.forEach((caller) => {
                const element = Entry.createElement('li');
                !caller.object.thumbnailView_ && caller.object.generateView();
                const thumb = caller.object.thumbnailView_.cloneNode();
                thumb.addClass('thmb');
                element.appendChild(thumb);
                Entry.createElement('span')
                    .addClass('text')
                    .appendTo(element).innerHTML = `${caller.object.name} : ${
                        Lang.Blocks[`VARIABLE_${caller.block.type}`]
                    }`;
                element.variable = variable;
                element.bindOnClick((e) => {
                    e.stopPropagation();
                    if (Entry.playground.object != caller.object) {
                        Entry.container.selectObject();
                        Entry.container.selectObject(caller.object.id, true);
                    }
                    const block = caller.funcBlock || caller.block;
                    const board = _.result(block.view, 'getBoard');
                    if (board) {
                        board.activateBlock(block);
                    }
                    Entry.playground.toggleOnVariableView();
                    Entry.playground.changeViewMode('variable');
                });
                fragment.appendChild(element);
            });
            listView.appendChild(fragment);
        } else {
            Entry.createElement('li')
                .addClass('text red')
                .appendTo(listView).innerHTML =
                Lang.Workspace.no_use;
        }

        this.variableSettingView && this.variableSettingView.appendChild(usedWrapper);
        this.listSettingView && this.listSettingView.appendChild(usedWrapper);
    }

    /**
     * @param {object} variable
     */
    renderFunctionReference(func) {
        const that = this;

        const callers = [...this._functionRefs];

        func.usedView && $(func.usedView).remove();
        let usedWrapper;

        if (callers.length) {
            usedWrapper = Entry.createElement('div').addClass('use_block');
            const listView = Entry.createElement('ul')
                .addClass('obj_list')
                .appendTo(usedWrapper);
            const fragment = document.createDocumentFragment();
            callers.forEach((caller) => {
                const element = Entry.createElement('li');
                !caller.object.thumbnailView_ && caller.object.generateView();
                const thumb = element.appendChild(caller.object.thumbnailView_.cloneNode());
                thumb.addClass('thmb');
                element.appendChild(thumb);
                const nameElement = Entry.createElement('div').addClass(
                    'entryVariableListCallerNameWorkspace'
                );
                nameElement.innerHTML = caller.object.name;
                element.appendChild(nameElement);
                element.bindOnClick(function() {
                    if (Entry.playground.object != caller.object) {
                        Entry.container.selectObject();
                        Entry.container.selectObject(caller.object.id, true);
                    }
                    Entry.playground.toggleOnVariableView();
                    const block = caller.block;
                    const blockView = block.view;
                    blockView && blockView.getBoard().activateBlock(block);
                    Entry.playground.changeViewMode('variable');
                });
                fragment.appendChild(element);
            });
            listView.appendChild(fragment);
        } else {
            usedWrapper = Entry.createElement('p').addClass('caution_dsc');
            usedWrapper.innerHTML = Lang.Workspace.no_use;
        }

        func.usedView = usedWrapper;
        func.listElement.appendChild(usedWrapper);
    }

    /**
     * update list view
     */
    updateList() {
        const listView = this.listView_;
        if (!listView || !/^(variable|code)$/.test(_.result(Entry.playground, 'getViewMode'))) {
            return;
        }

        const isPythonMode = this._isPythonMode();
        if (isPythonMode) {
            listView.addClass('entryVariableContainerTextMode');
        } else {
            listView.removeClass('entryVariableContainerTextMode');
        }

        this.clearListElement();

        switch (this.viewMode_) {
            case 'all':
                this.updateAllTab();
                break;
            case 'message':
                this.updateMessageTab();
                break;
            case 'variable':
                this.updateVariableTab();
                break;
            case 'list':
                this.updateListTab();
                break;
            case 'func':
                this.updateFuncTab();
                break;
        }
    }

    makeChildVariableViews(arr, viewFunc, parent = this.listView_) {
        return _.each(arr, (data) => {
            !data.listElement && viewFunc(data);
            if (this._isPythonMode()) {
                $(data.listElement)
                    .find('input')
                    .each(function() {
                        $(this).attr('disabled', 'disabled');
                    });
            } else {
                $(data.listElement)
                    .find('input')
                    .each(function() {
                        $(this).removeAttr('disabled');
                    });
            }
            parent.appendChild(data.listElement);
            if (data.callerListElement) {
                parent.appendChild(data.callerListElement);
            }
        });
    }

    clearListElement() {
        const clearList = [this.listView_];
        for (const elem of clearList) {
            while (elem && elem.firstChild) {
                elem.removeChild(elem.lastChild);
            }
        }
        if (this.listSettingView) {
            $(this.listSettingView).remove();
            delete this.listSettingView;
        }
        if (this.variableSettingView) {
            $(this.variableSettingView).remove();
            delete this.variableSettingView;
        }
    }

    updateAllTab() {
        const createElement = Entry.createElement;
        const listView = this.listView_;
        const listWrapper = createElement('div').addClass(
            'entryVariableSplitterWorkspace unfold all'
        );

        const listBox = createElement('div')
            .addClass('attr_box unfold')
            .appendTo(listWrapper);

        const list = createElement('div')
            .addClass('list')
            .appendTo(listBox);

        this.makeChildVariableViews(this.messages_, this.createMessageView.bind(this), list);
        this.makeChildVariableViews(this.variables_, this.createVariableView.bind(this), list);
        this.makeChildVariableViews(this.lists_, this.createListView.bind(this), list);
        this.makeChildVariableViews(this.functions_, this.createFunctionView.bind(this), list);
        listView.appendChild(listWrapper);
    }

    updateMessageTab() {
        const createElement = Entry.createElement;
        const listView = this.listView_;

        if (Entry.isTextMode) {
            this.messageAddButton_.unBindOnClick().addClass('disabled');
        } else {
            this.messageAddButton_
                .bindOnClick(() => {
                    return Entry.do('variableContainerClickMessageAddButton');
                })
                .removeClass('disabled');
        }
        listView.appendChild(this.messageAddButton_);
        listView.appendChild(this.messageAddPanel.view);

        const messageList = createElement('div').addClass('entryVariableSplitterWorkspace unfold');

        const messageListBox = createElement('div')
            .addClass('attr_box')
            .appendTo(messageList);

        this.makeChildVariableViews(
            this.messages_,
            this.createMessageView.bind(this),
            messageListBox
        );
        listView.appendChild(messageList);
    }

    updateVariableTab() {
        const createElement = Entry.createElement;
        const listView = this.listView_;
        const info = this.variableAddPanel.info;
        if (info.object && !Entry.playground.object) {
            info.object = null;
        }

        if (Entry.isTextMode) {
            this.variableAddButton_.unBindOnClick().addClass('disabled');
        } else {
            this.variableAddButton_
                .bindOnClick(() => {
                    return Entry.do('variableContainerClickVariableAddButton');
                })
                .removeClass('disabled');
        }

        listView.appendChild(this.variableAddButton_);
        listView.appendChild(this.variableAddPanel.view);

        //global list container
        const globalList = createElement('div').addClass('entryVariableSplitterWorkspace');
        let isGlobalFolded = false;

        const globalListTitle = Entry.createElement('a')
            .addClass('attr_link')
            .bindOnClick(() => {
                isGlobalFolded = !isGlobalFolded;
                this.foldTab(globalList, isGlobalFolded, gLength);
            })
            .appendTo(globalList);

        const globalListBox = createElement('div')
            .addClass('attr_box')
            .appendTo(globalList);

        //local list container
        const localList = createElement('div').addClass('entryVariableSplitterWorkspace');
        let isLocalFolded = false;

        const localListTitle = Entry.createElement('a')
            .addClass('attr_link')
            .bindOnClick(() => {
                isLocalFolded = !isLocalFolded;
                this.foldTab(localList, isLocalFolded, lLength);
            })
            .appendTo(localList);

        const localListBox = createElement('div')
            .addClass('attr_box')
            .appendTo(localList);

        const { globalV, localV } = _.groupBy(this.variables_, ({ object_ }) => {
            return object_ ? 'localV' : 'globalV';
        });

        const gLength = (globalV || []).length;
        const lLength = (localV || []).length;
        globalListTitle.innerHTML = `${Lang.Workspace.Variable_used_at_all_objects} (${gLength})`;
        localListTitle.innerHTML = `${Lang.Workspace.Variable_used_at_special_object} (${lLength})`;
        this.foldTab(globalList, isGlobalFolded, gLength);
        this.foldTab(localList, isLocalFolded, lLength);

        listView.appendChild(globalList);
        this.makeChildVariableViews(globalV, this.createVariableView.bind(this), globalListBox);
        listView.appendChild(localList);
        this.makeChildVariableViews(localV, this.createVariableView.bind(this), localListBox);
        this.updateVariableAddView('variable');
    }

    foldTab(tab, isFold, count = 0) {
        if (!count) {
            return;
        }
        if (isFold) {
            tab.removeClass('unfold');
            tab.addClass('fold');
        } else {
            tab.addClass('unfold');
            tab.removeClass('fold');
        }
    }

    updateListTab() {
        const createElement = Entry.createElement;
        const listView = this.listView_;
        const info = this.listAddPanel.info;
        if (info.object && !Entry.playground.object) {
            info.object = null;
        }

        if (Entry.isTextMode) {
            this.listAddButton_.unBindOnClick().addClass('disabled');
        } else {
            this.listAddButton_
                .bindOnClick(() => {
                    return Entry.do('variableContainerClickListAddButton');
                })
                .removeClass('disabled');
        }
        listView.appendChild(this.listAddButton_);
        listView.appendChild(this.listAddPanel.view);

        //global list container
        const globalList = createElement('div').addClass('entryVariableSplitterWorkspace');
        let isGlobalFolded = false;

        const globalListTitle = Entry.createElement('a')
            .addClass('attr_link')
            .bindOnClick(() => {
                isGlobalFolded = !isGlobalFolded;
                this.foldTab(globalList, isGlobalFolded, gLength);
            })
            .appendTo(globalList);

        const globalListBox = createElement('div')
            .addClass('attr_box')
            .appendTo(globalList);

        //local list container
        const localList = createElement('div').addClass('entryVariableSplitterWorkspace');
        let isLocalFolded = false;

        const localListTitle = Entry.createElement('a')
            .addClass('attr_link')
            .bindOnClick(() => {
                isLocalFolded = !isLocalFolded;
                this.foldTab(localList, isLocalFolded, lLength);
            })
            .appendTo(localList);

        const localListBox = createElement('div')
            .addClass('attr_box')
            .appendTo(localList);

        const { localV, globalV } = _.groupBy(this.lists_, ({ object_ }) => {
            return object_ ? 'localV' : 'globalV';
        });

        const gLength = (globalV || []).length;
        const lLength = (localV || []).length;
        globalListTitle.innerHTML = `${Lang.Workspace.List_used_all_objects} (${gLength})`;
        localListTitle.innerHTML = `${Lang.Workspace.list_used_specific_objects} (${lLength})`;
        this.foldTab(globalList, isGlobalFolded, gLength);
        this.foldTab(localList, isLocalFolded, lLength);

        listView.appendChild(globalList);
        this.makeChildVariableViews(globalV, this.createListView.bind(this), globalListBox);
        listView.appendChild(localList);
        this.makeChildVariableViews(localV, this.createListView.bind(this), localListBox);
        this.updateVariableAddView('variable');
    }

    updateFuncTab() {
        const createElement = Entry.createElement;
        const listView = this.listView_;

        if (Entry.isTextMode) {
            this.functionAddButton_.unBindOnClick().addClass('disabled');
        } else {
            this.functionAddButton_
                .bindOnClick(() => {
                    return Entry.do('funcCreateStart', Entry.generateHash());
                })
                .removeClass('disabled');
        }
        listView.appendChild(this.functionAddButton_);

        const funcList = createElement('div').addClass('entryVariableSplitterWorkspace unfold');

        const funcListBox = createElement('div')
            .addClass('attr_box')
            .appendTo(funcList);

        this.makeChildVariableViews(
            this.functions_,
            this.createFunctionView.bind(this),
            funcListBox
        );
        listView.appendChild(funcList);
    }

    /**
     * @param {!Array.<message model>} objectModels
     */
    setMessages(messages = []) {
        this.messages_ = messages.map((message) => {
            if (!message.id) {
                message.id = Entry.generateHash();
            }
            return message;
        });
        Entry.playground.reloadPlayground();
    }

    /**
     * @param {!Array.<message model>} objectModels
     */
    appendMessages(messages) {
        for (const i in messages) {
            const message = messages[i];
            if (!message.id) {
                message.id = Entry.generateHash();
            } else if (
                this.messages_.some((item) => {
                    return item.id === message.id;
                })
            ) {
                continue;
            }
            let name = message.name;
            name = this.checkAllVariableName(name, 'messages_', 'name')
                ? Entry.getOrderedName(name, this.messages_, 'name')
                : name;
            message.name = name;
            this.messages_.push(message);
        }
        Entry.playground.reloadPlayground();
    }

    /**
     * @param {!Array.<variable model>} variables
     */
    setVariables(variables = []) {
        variables.forEach((variable) => {
            variable = new Entry.Variable(variable);
            switch (variable.getType()) {
                case 'variable':
                case 'slide':
                    variable.generateView(this.variables_.length);
                    this.variables_.push(variable);
                    break;
                case 'list':
                    variable.generateView(this.lists_.length);
                    this.lists_.push(variable);
                    break;
                case 'timer':
                    this.generateTimer(variable);
                    break;
                case 'answer':
                    this.generateAnswer(variable);
                    break;
            }
        });

        if (_.isEmpty(Entry.engine.projectTimer)) {
            this.generateTimer();
        }
        if (_.isEmpty(Entry.container.inputValue)) {
            this.generateAnswer();
        }

        Entry.playground.reloadPlayground();
    }

    generateVariable(variable, data, key) {
        const name = variable.name_;
        variable.generateView(data.length);
        variable.name_ = this.checkAllVariableName(name, key)
            ? Entry.getOrderedName(name, data, 'name_')
            : name;
    }

    /**
     * @param {!Array.<variable model>} variables
     */
    appendVariables(variables) {
        for (const i in variables) {
            const variable = new Entry.Variable(variables[i]);
            if (!variable.id_) {
                variable.id_ = Entry.generateHash();
            }
            const type = variable.getType();
            if (type === 'variable' || type === 'slide') {
                if (
                    this.variables_.some((item) => {
                        return item.id_ === variable.id_;
                    })
                ) {
                    continue;
                }
                this.generateVariable(variable, this.variables_, 'variables_');
                this.variables_.push(variable);
            } else if (type === 'list') {
                if (
                    this.lists_.some((item) => {
                        return item.id_ === variable.id_;
                    })
                ) {
                    continue;
                }
                this.generateVariable(variable, this.lists_, 'lists_');
                this.lists_.push(variable);
            }
        }
        if (Entry.isEmpty(Entry.engine.projectTimer)) {
            Entry.variableContainer.generateTimer();
        }
        if (Entry.isEmpty(Entry.container.inputValue)) {
            Entry.variableContainer.generateAnswer();
        }
        Entry.playground.reloadPlayground();
    }

    /**
     * @param {!Array.<function model>} variables
     */
    setFunctions(functions = []) {
        functions.forEach((func) => {
            func = new Entry.Func(func);
            func.generateBlock();
            this.functions_[func.id] = func;
        });
    }

    /**
     * @param {!Array.<function model>} variables
     */
    appendFunctions(functions = []) {
        for (const i in functions) {
            const func = functions[i];
            if (!func.id) {
                func.id = Entry.generateHash();
            } else if (`${func.id}` in this.functions_) {
                continue;
            }
            const parseFunc = new Entry.Func(func);
            this.changeFunctionName(parseFunc);
            parseFunc.generateBlock();
            this.functions_[parseFunc.id] = parseFunc;
        }
    }

    changeFunctionName(func) {
        const params = func.content.getEventMap('funcDef')[0].params[0].data.params;
        const funcParamInfo = this.getFunctionParamInfo(params);
        const funcParamName = this.getFunctionParamName(funcParamInfo);
        const funcKeys = Object.keys(this.functions_);
        const funcsParamNames = funcKeys.map((key) => {
            const func = this.functions_[key];
            const params = func.content.getEventMap('funcDef')[0].params[0].data.params;
            const info = this.getFunctionParamInfo(params);
            return {
                name: this.getFunctionParamName(info),
            };
        });

        const isDuplecate = funcsParamNames.some(({ name }) => {
            return funcParamName === name;
        });

        if (isDuplecate) {
            const orderedNumber = Entry.getOrderedNameNumber(
                funcParamName,
                funcsParamNames,
                'name'
            );
            for (let i = funcParamInfo.length - 1; ; i--) {
                const info = funcParamInfo[i];
                if (info.type === 'string') {
                    info.parent[0] += orderedNumber;
                    break;
                }
            }

            Entry.Func.generateWsBlock(func);
        }
    }

    getFunctionParamName(info) {
        return info.reduce((acc, { name }) => {
            return (acc += name);
        }, '');
    }

    getFunctionParamInfo(parentParams) {
        const info = [];
        parentParams.forEach((param, index) => {
            if (typeof param === 'string') {
                info[index] = {
                    name: param,
                    type: 'string',
                    parent: parentParams,
                };
            } else if (param instanceof Entry.Block) {
                const { data = {} } = param;
                const { params = [], type } = data;

                if (type.indexOf('stringParam') === 0 || type.indexOf('booleanParam') === 0) {
                    const name = type.slice(0, -5);
                    info[index] = {
                        name,
                        type: name,
                        parent: parentParams,
                    };
                } else {
                    const childParamInfo = this.getFunctionParamInfo(params);
                    childParamInfo.forEach((childInfo, childIndex) => {
                        info[childIndex + index] = childInfo;
                    });
                }
            }
        });
        return info;
    }

    /**
     * get func
     * @return {Entry.Func}
     */
    getFunction(funcId) {
        return this.functions_[funcId];
    }

    /**
     * get variable on canvas
     * @return {Entry.Variable}
     */
    getVariable(id_, entity = {}) {
        const criteria = { id_ };
        let variable = _.find(this.variables_, criteria);
        if (entity.isClone && variable.object_) {
            variable = _.find(entity.variables, criteria);
        }

        return variable;
    }

    /**
     * get variable on canvas
     * @return {Entry.List}
     */
    getList(listId, { isClone, lists } = {}) {
        const criteria = { id_: listId };
        let list = _.find(this.lists_, criteria);
        if (isClone && list.object_) {
            list = _.find(lists, criteria);
        }

        return list;
    }

    /**
     * Create function
     */
    createFunction(data) {
        if (Entry.Func.isEdit) {
            return;
        }
        Entry.Func.edit(new Entry.Func(data));
    }

    /**
     * Remove variable
     * @param {Entry.Variable} variable
     */
    removeFunction({ id: functionId }) {
        const functions = this.functions_;
        functions[functionId].destroy();
        delete functions[functionId];
        const functionType = `func_${functionId}`;

        Entry.container.removeFuncBlocks(functionType);
        for (const id in functions) {
            functions[id].content.removeBlocksByType(functionType);
        }
        this.updateList();
    }

    checkListPosition(list, mouse) {
        const pos = {
            start_w: list.x_,
            area_w: list.x_ + list.width_,
            start_h: -list.y_,
            area_h: -list.y_ + -list.height_,
        };

        if (mouse.x > pos.start_w && mouse.x < pos.area_w) {
            if (mouse.y < pos.start_h && mouse.y > pos.area_h) {
                return true;
            }
        }
        return false;
    }

    getListById(mouseevt) {
        const lists = this.lists_;
        const returnList = [];
        if (lists.length > 0) {
            for (let i = 0; i < lists.length; i++) {
                if (this.checkListPosition(lists[i], mouseevt)) {
                    returnList.push(lists[i]);
                }
            }
            return returnList;
        }
        return false;
    }

    _getVariableByName(arr, variableName, isSelf, currentObjectId) {
        const object = _.result(Entry.playground, 'object');
        if (!currentObjectId && object) {
            currentObjectId = object.id;
        }

        for (let i = 0; i < arr.length; i++) {
            const v = arr[i];
            if (isSelf === true) {
                if (!v.object_ || v.object_ !== currentObjectId) {
                    continue;
                }
            } else if (isSelf === false) {
                if (v.object_) {
                    continue;
                }
            }

            if (v.getName() === variableName) {
                return v;
            }
        }
    }

    getVariableByName(variableName, isSelf, currentObjectId) {
        return this._getVariableByName(this.variables_, variableName, isSelf, currentObjectId);
    }

    getListByName(name, isSelf, currentObjectId) {
        return this._getVariableByName(this.lists_, name, isSelf, currentObjectId);
    }

    /**
     * Save variable
     * @param {Entry.Func} func
     */
    saveFunction(func) {
        /* add to function list when not exist */
        const ws = Entry.getMainWS();

        if (ws && ws.overlayModefrom == Entry.Workspace.MODE_VIMBOARD) {
            if (func && func.description) {
                const funcName = func.description.substring(1, func.description.length - 1);
                const alertMsg = Entry.TextCodingUtil.isNameIncludeSpace(funcName, 'function');
                if (alertMsg) {
                    entrylms.alert(alertMsg);
                    Entry.Func.cancelEdit();
                    return;
                }
            }
        }

        if (!this.functions_[func.id]) {
            this.functions_[func.id] = func;
            this.createFunctionView(func);
        }
        if (func.listElement) {
            func.listElement.nameField.innerHTML = func.description;
        }

        this.updateList();
    }

    /**
     * @param {Entry.Func} func
     */
    createFunctionView(func) {
        const createElement = Entry.createElement;

        const view = Entry.createElement('div').addClass('list default_func');

        const editBoxWrapper = createElement('div')
            .addClass('inpt_box')
            .bindOnClick((e) => {
                e.stopPropagation();
                if (!Entry.isTextMode) {
                    Entry.Func.edit(func);
                }
                return this.select(func);
            })
            .appendTo(view);
        const editBoxInputWrapper = createElement('div')
            .addClass('inpt')
            .appendTo(editBoxWrapper);
        const editBoxInput = createElement('span')
            .addClass('input')
            .appendTo(editBoxInputWrapper);
        editBoxInput.innerHTML = func.description;

        const delButton = createElement('a')
            .addClass('del')
            .bindOnClick((e) => {
                e.stopPropagation();
                entrylms.confirm(Lang.Workspace.will_you_delete_function).then((result) => {
                    if (result === true) {
                        this.removeFunction(func);
                        this.selected = null;
                    }
                });
            })
            .appendTo(editBoxWrapper);
        delButton.href = '#';
        view.nameField = editBoxInput;
        func.listElement = view;
    }

    /**
     * Add variable
     * @param {Entry.Variable} variable
     * @return {boolean} return true when success
     */
    checkAllVariableName(name, variable) {
        return this[variable].some(({ name_ }) => {
            return name_ === name;
        });
    }

    _addVariableOrList(type, data) {
        if (!type) {
            return;
        }
        const panel = this._getAddPanel(type);
        const name = panel.view.name.value.trim();

        if (Entry.isTextMode) {
            const alertMsg = Entry.TextCodingUtil.isNameIncludeSpace(name, type);
            if (alertMsg) {
                entrylms.alert(alertMsg);
                this.resetVariableAddPanel(type);
                return;
            }
        }

        const target = `${type}s_`;

        data = data || this._makeVariableData(type);

        this.resetVariableAddPanel(type);

        if (!(data instanceof Entry.Variable)) {
            data = new Entry.Variable(data);
        }

        if (type === 'variable') {
            this.createVariableView(data);
        } else {
            this.createListView(data);
        }

        data.generateView(this[target].length);

        this[target].unshift(data);

        const playground = Entry.playground;

        if (playground) {
            const { blockMenu } = playground;
            if (blockMenu) {
                blockMenu.deleteRendered('variable');
            }
            playground.reloadPlayground();
        }

        this.updateList();
    }

    addVariable(variable) {
        this._addVariableOrList.call(this, 'variable', variable);
    }

    /**
     * Remove variable
     * @param {Entry.Variable} variable
     */
    removeVariable(variable) {
        if (!(variable instanceof Entry.Variable)) {
            variable = this.getVariable(variable.id);
        }

        if (this.selected == variable) {
            this.select(null);
        }

        variable.remove();
        const variables = this.variables_;
        variables.splice(variables.indexOf(variable), 1);
        Entry.playground.reloadPlayground();
        this.updateList();
    }

    /**
     * @param {Entry.Variable} variable
     * @param {String} name
     */
    changeVariableName(variable, name) {
        if (variable.name_ == name) {
            return;
        }

        if (Entry.isTextMode) {
            const alertMsg = Entry.TextCodingUtil.isNameIncludeSpace(name, 'variable');
            if (alertMsg) {
                entrylms.alert(alertMsg);
                variable.listElement.nameField.value = variable.name_;
                return;
            }
        }

        if (Entry.isExist(name, 'name_', this.variables_)) {
            variable.listElement.nameField.value = variable.name_;
            return Entry.toast.alert(
                Lang.Workspace.variable_rename_failed,
                Lang.Workspace.variable_dup
            );
        } else if (name.length > 10) {
            variable.listElement.nameField.value = variable.name_;
            return Entry.toast.alert(
                Lang.Workspace.variable_rename_failed,
                Lang.Workspace.variable_too_long
            );
        }
        variable.setName(name);
        variable.listElement.nameField.value = name;
        Entry.playground.reloadPlayground();
        Entry.toast.success(Lang.Workspace.variable_rename, Lang.Workspace.variable_rename_ok);
    }

    /**
     * @param {Entry.Variable} list
     * @param {String} name
     */
    changeListName(list, name) {
        if (list.name_ == name) {
            return;
        }

        if (Entry.isTextMode) {
            const alertMsg = Entry.TextCodingUtil.isNameIncludeSpace(name, 'list');
            if (alertMsg) {
                entrylms.alert(alertMsg);
                list.listElement.nameField.value = list.name_;
                return;
            }
        }

        if (Entry.isExist(name, 'name_', this.lists_)) {
            Entry.toast.alert(Lang.Workspace.list_rename_failed, Lang.Workspace.list_dup);
        } else if (name.length > 10) {
            Entry.toast.alert(Lang.Workspace.list_rename_failed, Lang.Workspace.list_too_long);
        } else {
            //name successfully changed
            list.name_ = name;
            list.updateView();
            Entry.playground.reloadPlayground();
            Entry.toast.success(Lang.Workspace.list_rename, Lang.Workspace.list_rename_ok);
        }

        list.listElement.nameField.value = list.name_;
    }

    /**
     * Remove list
     * @param {Entry.Variable} list
     */
    removeList(list) {
        if (!(list instanceof Entry.Variable)) {
            list = this.getList(list.id);
        }

        if (this.selected == list) {
            this.select(null);
        }
        list.remove();
        const lists = this.lists_;
        lists.splice(lists.indexOf(list), 1);
        Entry.playground.reloadPlayground();
        this.updateList();
    }

    /**
     * @param {Entry.Variable} variable
     */
    createVariableView(variable) {
        const that = this;
        const createElement = Entry.createElement;

        const variableWrapper = createElement('div').addClass('list fold');

        if (!variable.object_) {
            if (variable.isCloud_) {
                variableWrapper.addClass('global_val');
            } else {
                variableWrapper.addClass('default_val');
            }
        } else {
            variableWrapper.addClass('local_val');
        }

        const editBoxWrapper = createElement('div')
            .addClass('inpt_box')
            .bindOnClick(function(e) {
                e.stopPropagation();

                if (that.variableSettingView) {
                    $(that.variableSettingView).remove();
                    delete that.variableSettingView;
                }

                if (that.selected === variable) {
                    if (!that._isPythonMode()) {
                        editBoxInput.blur();
                    }
                    that.select(variable);
                    that.updateSelectedVariable(null, 'variable');
                } else {
                    Entry.do('setVariableEditable', variable.id_);
                }
            })
            .appendTo(variableWrapper);
        const editBoxInputWrapper = createElement('div')
            .addClass('inpt')
            .appendTo(editBoxWrapper);
        const editBoxInput = createElement('input')
            .addClass('editBoxInput')
            .bindOnClick((e) => {
                e.stopPropagation();
            })
            .appendTo(editBoxInputWrapper);
        editBoxInput.setAttribute('type', 'text');
        editBoxInput.setAttribute('name', 'inpt_name');
        editBoxInput.value = variable.name_;
        editBoxInput.onblur = function() {
            const value = this.value.trim();
            if (!value) {
                Entry.toast.alert(Lang.Msgs.warn, Lang.Msgs.variable_can_not_space);
                this.value = variable.getName();
                return this.focus();
            }
            const targetVariable = that.getVariable(variable.getId());
            targetVariable && Entry.do('variableSetName', targetVariable.getId(), value);
        };
        editBoxInput.onkeydown = Entry.Utils.blurWhenEnter;
        const watchButton = createElement('a')
            .addClass('watch')
            .bindOnClick((e) => {
                e.stopPropagation();
                Entry.do('variableSetVisibility', variable.id_, !variable.isVisible());
                if (variable.isVisible()) {
                    watchButton.addClass('on');
                } else {
                    watchButton.removeClass('on');
                }
            })
            .appendTo(editBoxWrapper);
        if (variable.isVisible()) {
            watchButton.addClass('on');
        } else {
            watchButton.removeClass('on');
        }
        watchButton.href = '#';
        const delButton = createElement('a')
            .addClass('del')
            .bindOnClick((e) => {
                e.stopPropagation();
                Entry.do('variableContainerRemoveVariable', variable);
            })
            .appendTo(editBoxWrapper);
        delButton.href = '#';
        variableWrapper.nameField = editBoxInput;
        variable.listElement = variableWrapper;
    }

    /**
     * Add event for block
     * @param {message model} message
     * @return {boolean} return true when success
     */
    addMessage(message = {}) {
        const messages = this.messages_;
        if (!message.name) {
            message.name = `${Lang.Workspace.message} ${messages.length + 1}`;
        }
        if (!message.id) {
            message.id = Entry.generateHash();
        }
        this.createMessageView(message);
        messages.unshift(message);

        const { playground } = Entry;

        if (playground) {
            const { blockMenu } = playground;
            if (blockMenu) {
                blockMenu.deleteRendered('start');
            }
            playground.reloadPlayground();
        }
        this.updateList();
        const nameField = message.listElement.nameField;

        //flag for first time blur command
        //focus first and value not changed
        //command will be skipped
        nameField.isFirst = true;
        Entry.Utils.focusIfNotActive(nameField);
    }

    /**
     * Add event
     * @param {message model} message
     */
    removeMessage({ id }) {
        const message = this.getMessage(id);
        if (this.selected == message) {
            this.select(null);
        }
        const messages_ = this.messages_;
        messages_.splice(messages_.indexOf(message), 1);
        this.updateList();
        Entry.playground.reloadPlayground();
    }

    /**
     * @param {object} message
     * @param {String} name
     */
    changeMessageName({ id }, name) {
        const message = this.getMessage(id);
        if (message.name == name) {
            return;
        }

        const messages = this.messages_;
        const exist = Entry.isExist(name, 'name', messages);

        const { listElement: { nameField } } = message;
        const { playground, toast } = Entry;

        if (exist) {
            return failFunc(
                message.name,
                Lang.Workspace.message_rename_failed,
                Lang.Workspace.message_dup
            );
        } else if (name.length > 10) {
            return failFunc(
                message.name,
                Lang.Workspace.message_rename_failed,
                Lang.Workspace.message_too_long
            );
        }

        message.name = name;
        nameField.value = message.name;
        if (playground) {
            playground.blockMenu.deleteRendered('start');
            playground.reloadPlayground();
        }
        toast.success(Lang.Workspace.message_rename, Lang.Workspace.message_rename_ok);

        function failFunc(value, title, message) {
            nameField.value = value;
            return toast.alert(title, message);
        }
    }

    activateMessageEditView(message) {
        $(message.listElement)
            .find('.entryVariableListElementNameWorkspace')
            .removeAttr('disabled')
            .focus();
    }

    /**
     * @param {object} message
     */
    createMessageView(message) {
        const createElement = Entry.createElement;

        const view = Entry.createElement('div').addClass('list default_message');

        const editBoxWrapper = createElement('div')
            .addClass('inpt_box')
            .bindOnClick((e) => {
                e.stopPropagation();
                return this.select(message);
            })
            .appendTo(view);
        const editBoxInputWrapper = createElement('div')
            .addClass('inpt')
            .appendTo(editBoxWrapper);
        const editBoxInput = createElement('input')
            .addClass('editBoxInput')
            .bindOnClick((e) => {
                e.stopPropagation();
            })
            .appendTo(editBoxInputWrapper);
        editBoxInput.setAttribute('type', 'text');
        editBoxInput.value = message.name;
        editBoxInput.onfocus = Entry.Utils.setFocused;
        editBoxInput.onblur = Entry.Utils.setBlurredTimer(function() {
            const value = this.value;
            if (!value.trim()) {
                Entry.toast.alert(Lang.Msgs.warn, Lang.Msgs.sign_can_not_space);
                this.value = message.name;
                return this.focus();
            }

            //check message exist currently
            message = Entry.variableContainer.getMessage(message.id);
            if (message && !(this.isFirst && value === message.name)) {
                Entry.do('messageSetName', message.id, value);
            }
            delete this.isFirst;
        }, 200);
        editBoxInput.onkeydown = Entry.Utils.blurWhenEnter;

        const delButton = createElement('a')
            .addClass('del')
            .bindOnClick((e) => {
                e.stopPropagation();
                Entry.do('variableContainerRemoveMessage', message);
            })
            .appendTo(editBoxWrapper);
        delButton.href = '#';
        view.nameField = editBoxInput;
        message.listElement = view;
    }

    /**
     * Add list for block
     * @param {list model} list
     * @return {boolean} return true when success
     */
    addList(list) {
        this._addVariableOrList.call(this, 'list', list);
    }

    /**
     * @param {Entry.Variable} list
     */
    createListView(list) {
        const that = this;
        const createElement = Entry.createElement;

        const listWrapper = createElement('div')
            .addClass('list fold')
            .appendTo(this.globalListBox);

        if (!list.object_) {
            if (list.isCloud_) {
                listWrapper.addClass('global_list');
            } else {
                listWrapper.addClass('default_list');
            }
        } else {
            listWrapper.addClass('local_list');
        }

        const editBoxWrapper = createElement('div')
            .addClass('inpt_box')
            .bindOnClick(function(e) {
                e.stopPropagation();

                if (that.listSettingView) {
                    $(that.listSettingView).remove();
                    delete that.listSettingView;
                }

                if (that.selected === list) {
                    editBoxInput.blur();
                    that.select(list);
                    that.updateSelectedVariable(null, 'list');
                } else {
                    Entry.do('setListEditable', list.id_);
                }
            })
            .appendTo(listWrapper);
        const editBoxInputWrapper = createElement('div')
            .addClass('inpt')
            .appendTo(editBoxWrapper);
        const editBoxInput = createElement('input')
            .addClass('editBoxInput')
            .bindOnClick((e) => {
                e.stopPropagation();
            })
            .appendTo(editBoxInputWrapper);
        editBoxInput.setAttribute('type', 'text');
        editBoxInput.setAttribute('name', 'inpt_name');
        editBoxInput.value = list.name_;
        editBoxInput.onblur = function() {
            const value = this.value.trim();
            if (!value) {
                Entry.toast.alert(Lang.Msgs.warn, Lang.Msgs.list_can_not_space);
                this.value = list.getName();
                return this.focus();
            }
            const targetList = that.getList(list.getId());
            targetList && Entry.do('listSetName', targetList.getId(), value);
        };
        editBoxInput.onkeydown = Entry.Utils.blurWhenEnter;
        const watchButton = createElement('a')
            .addClass('watch')
            .bindOnClick((e) => {
                e.stopPropagation();
                Entry.do('listSetVisibility', list.id_, !list.isVisible());
                if (list.isVisible()) {
                    watchButton.addClass('on');
                } else {
                    watchButton.removeClass('on');
                }
            })
            .appendTo(editBoxWrapper);
        if (list.isVisible()) {
            watchButton.addClass('on');
        } else {
            watchButton.removeClass('on');
        }
        watchButton.href = '#';
        const delButton = createElement('a')
            .addClass('del')
            .bindOnClick((e) => {
                e.stopPropagation();
                Entry.do('variableContainerRemoveList', list);
            })
            .appendTo(editBoxWrapper);
        delButton.href = '#';
        listWrapper.nameField = editBoxInput;
        list.listElement = listWrapper;
    }

    /**
     * Apply map function to variables. But this not replace object with returned one.
     * So giving map function don't have to return object.
     * And this support another arguments.
     * @param {!function} mapFunction
     * @param {} param
     */
    mapVariable(mapFunction, param) {
        this.variables_.forEach(_.partial(mapFunction, _, param));
    }

    /**
     * @param {!function} mapFunction
     * @param {} param
     */
    mapList(mapFunction, param) {
        this.lists_.forEach(_.partial(mapFunction, _, param));
    }

    /**
     * convert this variable's data to JSON.
     * @return {JSON}
     */
    getVariableJSON() {
        return [
            ...this.variables_,
            ...this.lists_,
            _.result(Entry.engine, 'projectTimer'),
            _.result(Entry.container, 'inputValue'),
        ]
            .filter(_.identity)
            .map((v) => {
                return v.toJSON ? v.toJSON() : v;
            });
    }

    /**
     * convert this message's data to JSON.
     * @return {JSON}
     */
    getMessageJSON() {
        return this.messages_.map(_.partial(_.pick, _, 'id', 'name'));
    }

    /**
     * convert this function's data to JSON.
     * @return {JSON}
     */
    getFunctionJSON() {
        return _.reduce(
            this.functions_,
            (acc, { id, content }) => {
                return [
                    ...acc,
                    {
                        id,
                        content: content.stringify(),
                    },
                ];
            },
            []
        );
    }

    resetVariableAddPanel(type = 'variable') {
        const panel = this._getAddPanel(type);
        if (!panel.view) {
            return;
        }
        const info = panel.info;
        info.isCloud = false;
        info.object = null;
        panel.view.name.value = '';
        panel.isOpen = false;
        this.updateVariableAddView(type);
    }

    generateVariableAddView() {
        const createElement = Entry.createElement;
        const _whenEnter = Entry.Utils.whenEnter;
        const _setFocused = Entry.Utils.setFocused;
        const _setBlurredTimer = Entry.Utils.setBlurredTimer;

        const that = this;

        // 변수 만들기 폼
        const variableAddSpace = createElement('div').addClass(
            'entryVariableAddSpaceWorkspace off'
        );
        this.variableAddPanel.view = variableAddSpace;
        this.variableAddPanel.isOpen = false;

        // 입력 폼
        const addSpaceNameWrapper = createElement('div')
            .addClass('entryVariableAddSpaceNameWrapperWorkspace')
            .appendTo(variableAddSpace);

        const addSpaceInputLabel = createElement('label')
            .addClass('entryVariableAddSpaceInputLabelWorkspace')
            .appendTo(addSpaceNameWrapper);
        addSpaceInputLabel.setAttribute('for', 'entryVariableAddSpaceInputWorkspace');
        addSpaceInputLabel.innerText = Lang.Workspace.Variable_placeholder_name;

        const addSpaceInput = createElement('input')
            .addClass('entryVariableAddSpaceInputWorkspace')
            .appendTo(addSpaceNameWrapper);
        addSpaceInput.setAttribute('type', 'text');
        addSpaceInput.id = 'entryVariableAddSpaceInputWorkspace';
        addSpaceInput.setAttribute('placeholder', '변수의 이름을 입력해주세요.');
        addSpaceInput.variableContainer = this;
        addSpaceInput.onkeypress = _whenEnter(function() {
            if (this.enterKeyDisabled) {
                this.blur();
            } else {
                that._addVariable();
            }
        });
        addSpaceInput.onfocus = _setFocused;
        const doBlur = _setBlurredTimer(function() {
            this.isBlurred = false;
            Entry.do('variableAddSetName', this.value);
            this.blurCallback && this.blurCallback();
        });
        addSpaceInput.onblur = () => {
            this.isBlurred = true;
            doBlur.apply(this);
        };
        this.variableAddPanel.view.name = addSpaceInput;

        // 모든 오브젝트
        const addSpaceGlobalWrapper = createElement('div')
            .addClass('entryVariableAddSpaceGlobalWrapperWorkspace on')
            .bindOnClick(() => {
                addSpaceLocalWrapper.removeClass('on');
                addSpaceGlobalWrapper.addClass('on');
                return Entry.do('variableAddSetScope', 'global');
            })
            .appendTo(variableAddSpace);
        this.variableAddPanel.view.globalCheck = addSpaceGlobalWrapper;

        createElement('span')
            .addClass('Workspace_text')
            .appendTo(addSpaceGlobalWrapper).innerHTML =
            Lang.Workspace.use_all_objects;

        createElement('span')
            .addClass('entryVariableAddSpaceCheckWorkspace')
            .appendTo(addSpaceGlobalWrapper);

        // 공유 리스트
        const addSpaceCloudWrapper = createElement('div')
            .addClass('entryVariableAddSpaceCloudWrapperWorkspace')
            .bindOnClick(() => {
                const { object, isCloud } = this.variableAddPanel.info;
                !object && Entry.do('variableAddSetCloud', !isCloud);
                if (isCloud) {
                    addSpaceCloudWrapper.removeClass('on');
                } else {
                    addSpaceCloudWrapper.addClass('on');
                }
            })
            .appendTo(addSpaceGlobalWrapper);
        variableAddSpace.cloudWrapper = addSpaceCloudWrapper;
        this.variableAddPanel.view.cloudCheck = addSpaceCloudWrapper;

        createElement('span')
            .addClass('entryVariableAddSpaceCloudSpanWorkspace')
            .appendTo(addSpaceCloudWrapper).innerHTML =
            Lang.Workspace.Variable_create_cloud;

        createElement('span')
            .addClass('entryVariableAddSpaceCheckWorkspace')
            .appendTo(addSpaceCloudWrapper);

        // 이 오브젝트에서 사용
        const addSpaceLocalWrapper = createElement('div')
            .addClass('entryVariableAddSpaceGlobalWrapperWorkspace')
            .bindOnClick(() => {
                addSpaceGlobalWrapper.removeClass('on');
                addSpaceCloudWrapper.removeClass('on');
                addSpaceLocalWrapper.addClass('on');
                return Entry.do('variableAddSetScope', 'local');
            })
            .appendTo(variableAddSpace);
        this.variableAddPanel.view.localCheck = addSpaceLocalWrapper;

        createElement('span')
            .addClass('Workspace_text')
            .appendTo(addSpaceLocalWrapper).innerHTML =
            Lang.Workspace.Variable_use_this_object;

        createElement('span')
            .addClass('entryVariableAddSpaceCheckWorkspace')
            .appendTo(addSpaceLocalWrapper);

        // 확인 취소 버튼
        const addSpaceButtonWrapper = createElement('div')
            .addClass('entryVariableAddSpaceButtonWrapperWorkspace')
            .appendTo(variableAddSpace);

        const addSpaceCancelButton = createElement('a')
            .addClass('entryVariableAddSpaceCancelWorkspace')
            .addClass('entryVariableAddSpaceButtonWorkspace')
            .bindOnClick(() => {
                this.variableAddPanel.view.addClass('off');
                this.resetVariableAddPanel('variable');
            })
            .appendTo(addSpaceButtonWrapper);
        addSpaceCancelButton.href = '#';
        addSpaceCancelButton.innerHTML = Lang.Buttons.cancel;

        const addSpaceConfirmButton = createElement('a')
            .addClass('entryVariableAddSpaceConfirmWorkspace')
            .addClass('entryVariableAddSpaceButtonWorkspace')
            .bindOnClick(() => {
                that._addVariable();
                this.variableAddPanel.view.addClass('off');
                this.resetVariableAddPanel('variable');
            })
            .appendTo(addSpaceButtonWrapper);
        addSpaceConfirmButton.href = '#';
        addSpaceConfirmButton.innerHTML = Lang.Buttons.save;
        this.variableAddConfirmButton = addSpaceConfirmButton;
    }

    _addVariable() {
        const variableInput = Entry.getDom(['variableContainer', 'variableAddInput']);
        const blurCallback = () => {
            delete variableInput.blurCallback;
            Entry.do(
                'variableContainerAddVariable',
                new Entry.Variable(this._makeVariableData('variable'))
            );
            const [variable] = this.variables_;
            this.updateSelectedVariable(variable);
            const { nameField } = variable.listElement;
            nameField.removeAttribute('disabled');
        };
        if (variableInput.isBlurred) {
            variableInput.blurCallback = blurCallback;
        } else {
            blurCallback();
        }
    }

    _addList() {
        const listInput = Entry.getDom(['variableContainer', 'listAddInput']);
        const blurCallback = () => {
            Entry.do(
                'variableContainerAddList',
                new Entry.Variable(this._makeVariableData('list'))
            );
            const [list] = this.lists_;
            this.updateSelectedVariable(list);
            const { nameField } = list.listElement;
            nameField.removeAttribute('disabled');
        };

        if (listInput.isBlurred) {
            listInput.blurCallback = blurCallback;
        } else {
            blurCallback();
        }
    }

    generateListAddView() {
        const createElement = Entry.createElement;
        const _setFocused = Entry.Utils.setFocused;
        const _setBlurredTimer = Entry.Utils.setBlurredTimer;

        const that = this;

        // 리스트 만들기 폼
        const listAddSpace = createElement('div').addClass('entryVariableAddSpaceWorkspace off');
        this.listAddPanel.view = listAddSpace;
        this.listAddPanel.isOpen = false;

        // 리스트 만들기
        const addSpaceNameWrapper = createElement('div')
            .addClass('entryVariableAddSpaceNameWrapperWorkspace')
            .appendTo(listAddSpace);

        const addSpaceInputLabel = createElement('label')
            .addClass('entryVariableAddSpaceInputLabelWorkspace')
            .appendTo(addSpaceNameWrapper);
        addSpaceInputLabel.innerText = Lang.Workspace.list_name;
        addSpaceInputLabel.setAttribute('for', 'entryVariableAddSpaceInputWorkspace');

        const addSpaceInput = createElement('input')
            .addClass('entryVariableAddSpaceInputWorkspace')
            .appendTo(addSpaceNameWrapper);
        addSpaceInput.setAttribute('type', 'text');
        addSpaceInput.id = 'entryVariableAddSpaceInputWorkspace';
        addSpaceInput.setAttribute('placeholder', '리스트의 이름을 입력해주세요.');
        addSpaceInput.onkeypress = Entry.Utils.whenEnter(function() {
            if (this.enterKeyDisabled) {
                this.blur();
            } else {
                that._addList();
            }
        });
        addSpaceInput.onfocus = _setFocused;
        const doBlur = _setBlurredTimer(function() {
            this.isBlurred = false;
            Entry.do('listAddSetName', this.value);
            this.blurCallback && this.blurCallback();
        });
        addSpaceInput.onblur = () => {
            this.isBlurred = true;
            doBlur.apply(this);
        };
        this.listAddPanel.view.name = addSpaceInput;

        // 모든 오브젝트에서 사용
        const addSpaceGlobalWrapper = createElement('div')
            .addClass('entryVariableAddSpaceGlobalWrapperWorkspace on')
            .bindOnClick(() => {
                addSpaceLocalWrapper.removeClass('on');
                addSpaceGlobalWrapper.addClass('on');
                return Entry.do('listAddSetScope', 'global');
            })
            .appendTo(listAddSpace);
        this.listAddPanel.view.globalCheck = addSpaceGlobalWrapper;

        createElement('span')
            .addClass('Workspace_text')
            .appendTo(addSpaceGlobalWrapper).innerHTML =
            Lang.Workspace.use_all_objects;

        createElement('span')
            .addClass('entryVariableAddSpaceCheckWorkspace')
            .appendTo(addSpaceGlobalWrapper);

        // 공유 리스트
        const addSpaceCloudWrapper = createElement('div')
            .addClass('entryVariableAddSpaceCloudWrapperWorkspace')
            .bindOnClick(() => {
                const { object, isCloud } = this.listAddPanel.info;
                !object && Entry.do('listAddSetCloud', !isCloud);
                if (isCloud) {
                    addSpaceCloudWrapper.removeClass('on');
                } else {
                    addSpaceCloudWrapper.addClass('on');
                }
            })
            .appendTo(addSpaceGlobalWrapper);
        listAddSpace.cloudWrapper = addSpaceCloudWrapper;
        this.listAddPanel.view.cloudCheck = addSpaceCloudWrapper;

        createElement('span')
            .addClass('entryVariableAddSpaceCloudSpanWorkspace')
            .appendTo(addSpaceCloudWrapper).innerHTML =
            Lang.Workspace.List_create_cloud;

        createElement('span')
            .addClass('entryVariableAddSpaceCheckWorkspace')
            .appendTo(addSpaceCloudWrapper);

        // 이 오브젝트에서 사용
        const addSpaceLocalWrapper = createElement('div')
            .addClass('entryVariableAddSpaceGlobalWrapperWorkspace')
            .bindOnClick(() => {
                addSpaceGlobalWrapper.removeClass('on');
                addSpaceCloudWrapper.removeClass('on');
                addSpaceLocalWrapper.addClass('on');
                return Entry.do('listAddSetScope', 'local');
            })
            .appendTo(listAddSpace);
        this.listAddPanel.view.localCheck = addSpaceLocalWrapper;

        createElement('span')
            .addClass('Workspace_text')
            .appendTo(addSpaceLocalWrapper).innerHTML =
            Lang.Workspace.Variable_use_this_object;

        createElement('span')
            .addClass('entryVariableAddSpaceCheckWorkspace')
            .appendTo(addSpaceLocalWrapper);

        // 확인 취소 버튼
        const addSpaceButtonWrapper = createElement('div')
            .addClass('entryVariableAddSpaceButtonWrapperWorkspace')
            .appendTo(listAddSpace);

        const addSpaceCancelButton = createElement('a')
            .addClass('entryVariableAddSpaceCancelWorkspace')
            .addClass('entryVariableAddSpaceButtonWorkspace')
            .bindOnClick(() => {
                this.listAddPanel.view.addClass('off');
                this.resetVariableAddPanel('list');
            })
            .appendTo(addSpaceButtonWrapper);
        addSpaceCancelButton.href = '#';
        addSpaceCancelButton.innerHTML = Lang.Buttons.cancel;

        const addSpaceConfirmButton = createElement('a')
            .addClass('entryVariableAddSpaceConfirmWorkspace')
            .addClass('entryVariableAddSpaceButtonWorkspace')
            .bindOnClick(() => {
                that._addList();
                this.listAddPanel.view.addClass('off');
                this.resetVariableAddPanel('list');
            })
            .appendTo(addSpaceButtonWrapper);
        addSpaceConfirmButton.href = '#';
        addSpaceConfirmButton.innerHTML = Lang.Buttons.save;
        this.listAddConfirmButton = addSpaceConfirmButton;
    }

    generateMessageAddView() {
        const createElement = Entry.createElement;

        // 신호 만들기 폼
        const msgAddSpace = createElement('div').addClass('message_inpt off');
        this.messageAddPanel.view = msgAddSpace;
        this.messageAddPanel.isOpen = false;

        const msgNameInput = createElement('input').appendTo(msgAddSpace);
        msgNameInput.setAttribute('type', 'text');
        msgNameInput.setAttribute('placeholder', '신호의 이름을 입력해주세요.');
        this.messageAddPanel.view.name = msgNameInput;

        const buttonWrapper = createElement('div')
            .addClass('entryVariableAddSpaceButtonWrapperWorkspace')
            .appendTo(msgAddSpace);

        const msgCancel = createElement('a')
            .addClass('entryVariableAddSpaceCancelWorkspace')
            .addClass('entryVariableAddSpaceButtonWorkspace')
            .bindOnClick(() => {
                msgAddSpace.addClass('off');
                msgNameInput.value = '';
                this.messageAddPanel.isOpen = false;
            })
            .appendTo(buttonWrapper);
        msgCancel.href = '#';
        msgCancel.innerHTML = Lang.Buttons.cancel;

        const msgConfirm = createElement('a')
            .addClass('entryVariableAddSpaceConfirmWorkspace')
            .addClass('entryVariableAddSpaceButtonWorkspace')
            .bindOnClick(() => {
                const value = msgNameInput.value;
                this.messageAddPanel.isOpen = false;
                msgAddSpace.addClass('off');
                msgNameInput.value = '';
                Entry.do('variableContainerAddMessage', {
                    id: Entry.generateHash(),
                    name: Entry.getOrderedName(
                        value || Lang.Workspace.message,
                        this.messages_,
                        'name'
                    ),
                });
            })
            .appendTo(buttonWrapper);
        msgConfirm.href = '#';
        msgConfirm.innerHTML = Lang.Buttons.save;

        msgAddSpace.nameField = msgNameInput;
    }

    openVariableAddPanel(type = 'variable') {
        Entry.playground.toggleOnVariableView();
        Entry.playground.changeViewMode('variable');
        switch (type) {
            case 'variable':
                this._getAddPanel().isOpen = true;
                this.selectFilter(type);
                this.updateVariableAddView(type);
                break;
            case 'list':
                this.listAddPanel.isOpen = true;
                this.selectFilter(type);
                this.updateVariableAddView(type);
                break;
            case 'message':
                this.messageAddPanel.isOpen = true;
                this.selectFilter(type);
                break;
        }
    }

    addCloneLocalVariables(param) {
        const that = this;

        //variables
        this.variables_
            .reduce((acc, variable) => {
                const cloned = clone(variable, param, 'variables_');
                cloned && acc.push(cloned);
                return acc;
            }, [])
            .forEach(this.addVariable.bind(this));

        //lists
        this.lists_
            .reduce((acc, list) => {
                const cloned = clone(list, param, 'lists_');
                cloned && acc.push(cloned);
                return acc;
            }, [])
            .forEach(this.addList.bind(this));

        function clone(variable, param, nameSpace) {
            //not a local variable
            const _object = variable.object_;
            if (!_object || _object !== param.objectId) {
                return;
            }

            const cloned = variable.toJSON();
            cloned.originId = cloned.id;
            cloned.id = Entry.generateHash();
            cloned.object = param.newObjectId;
            cloned.name = that.checkAllVariableName(cloned.name, nameSpace)
                ? Entry.getOrderedName(cloned.name, that[nameSpace], 'name_')
                : cloned.name;
            delete cloned.x;
            delete cloned.y;

            const json = param.json;
            json.script = json.script.replace(new RegExp(cloned.originId, 'g'), cloned.id);
            return cloned;
        }
    }

    generateTimer(timer) {
        timer =
            timer ||
            new Entry.Variable({
                id: Entry.generateHash(),
                name: Lang.Workspace.Variable_Timer,
                value: 0,
                variableType: 'timer',
                visible: false,
                x: 150,
                y: -70,
            });

        timer.generateView();
        timer.tick = null;
        Entry.engine.projectTimer = timer;

        Entry.addEventListener('stop', () => {
            Entry.engine.stopProjectTimer();
        });
    }

    //generate Answer
    generateAnswer(answer) {
        answer =
            answer ||
            new Entry.Variable({
                id: Entry.generateHash(),
                name: Lang.Blocks.VARIABLE_get_canvas_input_value,
                value: 0,
                variableType: 'answer',
                visible: false,
                x: 150,
                y: -100,
            });

        answer.generateView();
        Entry.container.inputValue = answer;
        Entry.container.inputValue.setName(Lang.Blocks.VARIABLE_get_canvas_input_value);
    }

    generateVariableSettingView() {
        const that = this;
        const createElement = Entry.createElement;
        const _setFocused = Entry.Utils.setFocused;
        const _setBlurredTimer = Entry.Utils.setBlurredTimer;

        // 변수 속성 설정
        const element = createElement('div')
            .addClass('attr_inner_box')
            .bindOnClick((e) => {
                return e.stopPropagation();
            });
        if (this.variableSettingView) {
            $(this.variableSettingView).remove();
            delete this.variableSettingView;
        }
        this.variableSettingView = element;

        const varAttr = createElement('div')
            .addClass('val_attr')
            .appendTo(element);
        const boxSubject = createElement('span')
            .addClass('box_sjt')
            .appendTo(varAttr);
        boxSubject.innerHTML = '변수 속성';

        // 기본 값 입력 창
        const attrInputBox = createElement('div')
            .addClass('attr_inpt')
            .appendTo(varAttr);
        if (this._isPythonMode()) {
            attrInputBox.addClass('hidden');
        }

        const attrInputLabel = createElement('label').appendTo(attrInputBox);
        attrInputLabel.setAttribute('for', 'attr_cnt');
        attrInputLabel.innerHTML = Lang.Workspace.default_value;

        const attrInput = createElement('input').appendTo(attrInputBox);
        attrInput.setAttribute('type', 'text');
        attrInput.value = 0;
        attrInput.onkeypress = Entry.Utils.blurWhenEnter;
        attrInput.onfocus = _setFocused;
        attrInput.onblur = _setBlurredTimer(function() {
            const v = that.selected;
            Entry.do('variableSetDefaultValue', v.id_, this.value);
        });
        element.initValueInput = attrInput;

        // 슬라이드 입력창
        const slideInputBox = createElement('div')
            .addClass('slide_inpt')
            .appendTo(varAttr);

        const slideCheckBox = createElement('div')
            .addClass('chk_box')
            .appendTo(slideInputBox);
        element.slideCheck = createElement('span')
            .addClass('entryVariableAddSpaceCheckWorkspace')
            .bindOnClick(() => {
                const v = that.selected;
                Entry.do(
                    'variableSetSlidable',
                    v.id_,
                    v.getType() === 'variable' ? 'slide' : 'variable'
                );
            })
            .appendTo(slideCheckBox);
        const slideCheckText = createElement('span')
            .addClass('chk_text')
            .appendTo(slideCheckBox);
        slideCheckText.innerHTML = '슬라이드';

        // 최소 최대 영역
        const slideCountBox = createElement('div')
            .addClass('cnt_box')
            .appendTo(slideInputBox);

        const minValueInput = createElement('input').appendTo(slideCountBox);
        minValueInput.innerHTML = Lang.Workspace.min_value;
        minValueInput.setAttribute('type', 'text');

        const v = that.selected;
        const vType = _.result(v, 'type');

        if (vType === 'slide') {
            minValueInput.value = v.minValue_;
        } else {
            minValueInput.value = 0;
        }
        minValueInput.onkeypress = Entry.Utils.blurWhenEnter;
        minValueInput.onfocus = _setFocused;
        minValueInput.onblur = _setBlurredTimer(function() {
            const v = that.selected;
            let value = this.value;
            value = Entry.Utils.isNumber(value) ? value : v.getMinValue();
            Entry.do('variableSetMinValue', v.id_, value);
        });
        element.minValueInput = minValueInput;

        createElement('span')
            .addClass('dash')
            .appendTo(slideCountBox).innerHTML =
            '~';

        const maxValueInput = createElement('input').appendTo(slideCountBox);
        maxValueInput.innerHTML = Lang.Workspace.max_value;
        maxValueInput.setAttribute('type', 'text');

        if (vType === 'slide') {
            maxValueInput.value = v.maxValue_;
        } else {
            maxValueInput.value = 100;
        }

        maxValueInput.onkeypress = Entry.Utils.blurWhenEnter;
        maxValueInput.onfocus = _setFocused;
        maxValueInput.onblur = _setBlurredTimer(function() {
            const v = that.selected;
            let value = this.value;
            value = Entry.Utils.isNumber(value) ? value : v.getMaxValue();
            Entry.do('variableSetMaxValue', v.id_, value);
        });
        element.maxValueInput = maxValueInput;
    }

    /**
     * @param {object|Entry.Variable} object
     */
    updateVariableSettingView(v) {
        const view = this.variableSettingView;
        if (!view) {
            return;
        }
        const {
            initValueInput: initValue,
            slideCheck: slide,
            minValueInput: minValue,
            maxValueInput: maxValue,
        } = view;

        slide.removeClass('on');
        if (v.getType() === 'slide') {
            slide.addClass('on');
            minValue.removeAttribute('disabled');
            maxValue.removeAttribute('disabled');
            minValue.value = v.getMinValue();
            maxValue.value = v.getMaxValue();
        } else {
            minValue.setAttribute('disabled', 'disabled');
            maxValue.setAttribute('disabled', 'disabled');
        }

        initValue.value = v.getValue();
        v.listElement.appendChild(view);
    }

    /**
     * 속성 > 리스트 편집창 표기
     */
    generateListSettingView() {
        const createElement = Entry.createElement;

        // 리스트 속성 설정
        const element = createElement('div')
            .addClass('attr_inner_box')
            .bindOnClick((e) => {
                return e.stopPropagation();
            });
        if (this.listSettingView) {
            $(this.listSettingView).remove();
            delete this.listSettingView;
        }
        this.listSettingView = element;

        const listAttr = createElement('div')
            .addClass('list_attr')
            .appendTo(element);
        if (this._isPythonMode()) {
            listAttr.addClass('hidden');
        }
        const boxSubject = createElement('span')
            .addClass('box_sjt')
            .appendTo(listAttr);
        boxSubject.innerHTML = '리스트 속성';

        this.generateListImportExportView(listAttr);
        this.generateListCountView(listAttr);
        this.generateListValuesView(listAttr);
    }

    generateListImportExportView(element) {
        const that = this;
        const createElement = Entry.createElement;

        const buttonBox = createElement('div')
            .addClass('btn_box')
            .appendTo(element);

        const buttonExport = createElement('a')
            .addClass('btn_list')
            .bindOnClick((e) => {
                e.stopPropagation();
                const { array_, name_ } = that.selected;

                if (array_.length === 0) {
                    entrylms.alert(Lang.Menus.nothing_to_export);
                } else {
                    Entry.dispatchEvent('openExportListModal', array_, name_);
                }
            })
            .appendTo(buttonBox);
        buttonExport.innerHTML = Lang.Workspace.list_export;

        const buttonImport = createElement('a')
            .addClass('btn_list')
            .bindOnClick((e) => {
                e.stopPropagation();
                Entry.dispatchEvent('openImportListModal');
            })
            .appendTo(buttonBox);
        buttonImport.innerHTML = Lang.Workspace.list_import;
    }

    generateListCountView(element) {
        const that = this;
        const createElement = Entry.createElement;

        const listCount = createElement('div')
            .addClass('list_cnt')
            .appendTo(element);

        const countSubject = createElement('span')
            .addClass('cnt_sjt')
            .appendTo(listCount);
        countSubject.innerHTML = Lang.Workspace.number_of_list;

        const countInputBox = createElement('div')
            .addClass('cnt_inpt')
            .appendTo(listCount);

        const buttonMinus = createElement('a')
            .addClass('btn_cnt')
            .bindOnClick(() => {
                const { selected: { id_ } } = that;
                Entry.do('listChangeLength', id_, 'minus');
            })
            .appendTo(countInputBox);
        buttonMinus.innerHTML = '-';
        buttonMinus.href = '#';
        this.listSettingView.minus = buttonMinus;

        const buttonPlus = createElement('a')
            .addClass('btn_cnt')
            .bindOnClick(() => {
                const { selected: { id_ } } = that;
                Entry.do('listChangeLength', id_, 'plus');
            })
            .appendTo(countInputBox);
        buttonPlus.innerHTML = '+';
        buttonPlus.href = '#';
        this.listSettingView.plus = buttonPlus;

        const countInput = createElement('input').appendTo(countInputBox);
        countInput.setAttribute('type', 'text');
        countInput.onblur = () => {
            const v = that.selected;
            let value = this.value;
            value = Entry.Utils.isNumber(value) ? value : v.array_.length;
            Entry.do('listChangeLength', v.id_, Number(value));
        };
        countInput.onkeypress = Entry.Utils.blurWhenEnter;
        this.listSettingView.lengthInput = countInput;
    }

    generateListValuesView(element) {
        const createElement = Entry.createElement;

        const countGroup = createElement('div')
            .addClass('cnt_group')
            .appendTo(element);
        const scrollBox = createElement('div')
            .addClass('scroll_box')
            .appendTo(countGroup);

        this.listSettingView.listValues = scrollBox;
    }

    updateListSettingView(list) {
        const view = this.listSettingView;
        if (!view) {
            return;
        }
        const createElement = Entry.createElement;
        list = list || this.selected;
        const { listValues, lengthInput } = view;
        const arr = list.array_ || [];
        lengthInput.value = arr.length;
        list.listElement.appendChild(view);
        //remove element and event bindings
        $(listValues).empty();
        const startIndex = Entry.getMainWS().mode === Entry.Workspace.MODE_VIMBOARD ? 0 : 1;
        let fragment;
        if (arr.length === 0) {
            fragment = document.createDocumentFragment();
            Entry.createElement('p')
                .addClass('caution_dsc')
                .appendTo(fragment).innerHTML =
                '추가된 항목이 없습니다.';
        } else {
            fragment = createElement('ol')
                .addClass('cnt_list')
                .appendTo(listValues);
            arr.forEach(({ data }, i) => {
                const wrapper = Entry.createElement('li').appendTo(fragment);
                Entry.createElement('span')
                    .addClass('cnt')
                    .appendTo(wrapper).innerHTML =
                    i + startIndex;
                const input = Entry.createElement('input').appendTo(wrapper);
                input.value = data;
                input.setAttribute('type', 'text');
                input.onfocus = Entry.Utils.setFocused;
                input.onblur = Entry.Utils.setBlurredTimer(function() {
                    Entry.do('listSetDefaultValue', list.id_, i, this.value);
                });
                input.onkeypress = Entry.Utils.blurWhenEnter;
                Entry.createElement('a')
                    .addClass('del')
                    .bindOnClick(() => {
                        arr.splice(i, 1);
                        this.updateListSettingView();
                    })
                    .appendTo(wrapper);
            });
        }
        listValues.appendChild(fragment);
        list.updateView();
    }

    setListLength(list, value) {
        value = Number(value);
        const arr = this.selected.array_;
        const times = value - arr.length;
        if (times && Entry.Utils.isNumber(value)) {
            if (times > 0) {
                _.times(times, () => {
                    return arr.push({ data: 0 });
                });
            } else {
                arr.length = value;
            }
        }
        this.updateListSettingView();
    }

    updateViews() {
        [...this.variables_, ...this.lists_].forEach((v) => {
            return v.updateView();
        });
    }

    updateSelectedVariable(object, type = 'variable') {
        const objectType = _.result(object, 'type');
        if (this.selected) {
            this.selected.listElement.removeClass('unfold');
            this.selected.listElement.addClass('fold');
        }
        if (!object) {
            if (type === 'variable') {
                this.selected = null;
            } else {
                this.selected = null;
            }
        } else if (objectType === 'variable' || objectType === 'slide') {
            this.selected = object;
            this.selected.listElement.removeClass('fold');
            this.selected.listElement.addClass('unfold');
            if (!this.variableSettingView) {
                this.generateVariableSettingView();
                this.renderVariableReference(object);
            }
            this.updateVariableSettingView(object);
        } else if (objectType === 'list') {
            this.selected = object;
            this.selected.listElement.removeClass('fold');
            this.selected.listElement.addClass('unfold');
            if (!this.listSettingView) {
                this.generateListSettingView();
                this.renderVariableReference(object);
            }
            this.updateListSettingView(object);
        }
    }

    removeLocalVariables(objectId) {
        if (!objectId) {
            return;
        }

        [...this.variables_].forEach((v) => {
            if (v.object_ == objectId) {
                this.removeVariable(v);
            }
        });
    }

    updateCloudVariables() {
        const projectId = Entry.projectId;
        if (!Entry.cloudSavable || !projectId) {
            return;
        }

        const _filterFunc = _.partial(_.result, _, 'isCloud_');

        const { variables_, lists_ } = Entry.variableContainer;

        const variables = variables_.reduce((acc, v) => {
            if (_filterFunc(v)) {
                return [...acc, v.toJSON()];
            }
            return acc;
        }, []);

        const lists = lists_.reduce((acc, v) => {
            if (_filterFunc(v)) {
                return [...acc, v.toJSON()];
            }
            return acc;
        }, []);

        //no variable or list to save
        if (!variables.length && !lists.length) {
            return;
        }

        let csrfToken = '';
        try {
            csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        } catch (e) {}

        $.ajax({
            url: `/api/project/variable/${projectId}`,
            type: 'PUT',
            headers: { 'csrf-token': csrfToken },
            data: {
                variables,
                lists,
            },
        });
    }

    addRef(type, blockData) {
        const wsMode = _.result(Entry.getMainWS(), 'getMode');
        if (!this.view_ || wsMode !== Entry.Workspace.MODE_BOARD) {
            return;
        }

        const datum = {
            object: blockData.getCode().object,
            block: blockData,
        };

        if (blockData.funcBlock) {
            datum.funcBlock = blockData.funcBlock;
            delete blockData.funcBlock;
        }

        this[type].push(datum);

        if (type == '_functionRefs') {
            const id = blockData.type.substr(5);
            const func = Entry.variableContainer.functions_[id];
            if (func.isAdded) {
                return;
            }
            func.isAdded = true;
            func.content.getBlockList().forEach((block) => {
                const blockType = block.type;
                if (blockType.indexOf('func_') > -1 && blockType.substr(5) == id) {
                    return;
                }

                [
                    ...(_.result(block.events, 'viewAdd') || []),
                    ...(_.result(block.events, 'dataAdd') || []),
                ].forEach((fn) => {
                    block.getCode().object = datum.object;
                    if (fn) {
                        block.funcBlock = datum.block;
                        fn(block);
                    }
                });
            });
        }

        return datum;
    }

    getObjectVariables(blockList, keys) {
        const findFuncKeys = keys || {};
        let functions = [];
        const jsonData = this.getVariableJSONByBlockList(blockList);
        let variables = jsonData.variables;
        let messages = jsonData.messages;

        blockList.forEach(
            function(block) {
                const type = block.type;
                if (type && type.indexOf('func_') === 0) {
                    const id = type.substr(5);
                    if (!findFuncKeys[id]) {
                        const func = this.functions_[id];
                        findFuncKeys[id] = true;
                        functions.push({
                            id,
                            content: JSON.stringify(func.content.toJSON()),
                        });

                        blockList = func.content.getBlockList();
                        const jsonData = this.getObjectVariables(blockList, findFuncKeys);
                        functions = functions.concat(jsonData.functions);
                        variables = variables.concat(jsonData.variables);
                        messages = messages.concat(jsonData.messages);
                    }
                }
            }.bind(this)
        );

        return {
            functions,
            variables,
            messages,
        };
    }

    getVariableJSONByBlockList(blockList) {
        const variables = [];
        const messages = [];
        const variableSet = [...this.variables_, ...this.lists_, ...this.messages_].reduce(
            (acc, data) => {
                acc[data.id_ || data.id] = data;
                return acc;
            },
            {}
        );

        blockList.forEach(function(block) {
            const data = block.data || {};
            const type = data.type;
            if (!type) {
                return;
            }
            const isMessage = _.includes(EntryStatic.messageBlockList, type);
            const isVariable = _.includes(EntryStatic.variableBlockList, type);

            if (isMessage || isVariable) {
                block.data.params.forEach(function(param) {
                    if (typeof param === 'string' && !!variableSet[param]) {
                        const item = variableSet[param];
                        if (isVariable) {
                            variables.push(item.toJSON());
                        } else {
                            messages.push({
                                id: item.id,
                                name: item.name,
                            });
                        }
                        variableSet[param] = undefined;
                    }
                });
            }
        });

        return {
            variables,
            messages,
        };
    }

    removeRef(type, block) {
        if (!Entry.playground.mainWorkspace) {
            return;
        }
        const wsMode = Entry.getMainWS().getMode();
        if (wsMode !== Entry.Workspace.MODE_BOARD) {
            return;
        }

        const arr = this[type];

        for (let i = 0; i < arr.length; i++) {
            if (arr[i].block == block) {
                arr.splice(i, 1);
                break;
            }
        }

        if (type === '_functionRefs') {
            const id = block.type.substr(5);
            const func = Entry.variableContainer.functions_[id];
            if (!func || func.isRemoved) {
                return;
            }
            func.isRemoved = true;
            if (func) {
                func.content.getBlockList().forEach((block) => {
                    if (block.type.indexOf('func_') > -1) {
                        if (block.type.substr(5) == id) {
                            return;
                        }
                    }

                    [
                        ...(_.result(block.events, 'viewDestroy') || []),
                        ...(_.result(block.events, 'dataDestroy') || []),
                    ].forEach((fn) => {
                        if (fn) {
                            fn(block);
                        }
                    });
                });
            }
        }
    }

    _getBlockMenu() {
        return _.result(Entry.getMainWS(), 'getBlockMenu');
    }

    _truncName(name, type, maxLen) {
        maxLen = maxLen || this._maxNameLength;

        if (name.length <= maxLen) {
            return name;
        }

        Entry.toast.warning(
            Lang.Workspace[`${type}_name_auto_edited_title`],
            Lang.Workspace[`${type}_name_auto_edited_content`]
        );

        return name.substring(0, maxLen);
    }

    _maxNameLength = 10;

    clear() {
        const _removeFunc = _.partial(_.result, _, 'remove');
        const _destroyFunc = _.partial(_.result, _, 'destroy');

        const { engine = {}, container = {}, playground } = Entry;

        [...this.variables_, ...this.lists_].forEach(_removeFunc);
        _removeFunc(engine.projectTimer);
        _removeFunc(container.inputValue);
        _.each(this.functions_, _destroyFunc);

        this.viewMode_ = 'all';
        this.variables_ = [];
        this.lists_ = [];
        this.messages_ = [];
        this.functions_ = {};

        playground.reloadPlayground();
        this.updateList();
    }

    _isPythonMode() {
        return _.result(Entry.getMainWS(), 'isVimMode');
    }

    getDom(query) {
        if (_.isEmpty(query)) {
            return;
        }

        query = [...query];

        switch (query.shift()) {
            case 'filter':
                return this.filterElements[query.shift()];
            case 'functionAddButton':
                return this.functionAddButton_;
            case 'variableAddButton':
                return this.variableAddButton_;
            case 'listAddButton':
                return this.listAddButton_;
            case 'variableAddConfirmButton':
                return this.variableAddConfirmButton;
            case 'listAddConfirmButton':
                return this.listAddConfirmButton;
            case 'variableAddInput':
                return this.variableAddPanel.view.name;
            case 'listAddInput':
                return this.listAddPanel.view.name;
            case 'messageAddButton':
                return this.messageAddButton_;
            case 'variableSetVisibility':
                return this.variableSettingView.visibleCheck;
            case 'listSetVisibility':
                return this.listSettingView.visibleCheck;
            case 'variableSetDefaultValue':
                return this.variableSettingView.initValueInput;
            case 'slideCheck':
                return this.variableSettingView.slideCheck;
            case 'variableMinValue':
                return this.variableSettingView.minValueInput;
            case 'variableMaxValue':
                return this.variableSettingView.maxValueInput;
            case 'messageList':
                return this.getMessage(query.shift()).listElement.nameField;
            case 'variableScope': {
                const { globalCheck, localCheck } = this._getAddPanel('variable').view;
                return query.shift() === 'global' ? globalCheck : localCheck;
            }
            case 'listScope': {
                const { globalCheck, localCheck } = this._getAddPanel('list').view;
                return query.shift() === 'global' ? globalCheck : localCheck;
            }
            case 'variableCloud':
                return this._getAddPanel('variable').view.cloudCheck;
            case 'listCloud':
                return this._getAddPanel('list').view.cloudCheck;
            case 'listChangeLength':
                return this.listSettingView[query.shift()];
            case 'listDefaultValue':
                return $('.entryListSettingEachInputWorkspace')[query.shift()];
            case 'messageEditButton':
                return $(this.getMessage(query.shift()).listElement).find('.editButton')[0];
            case 'variableEditButton':
                return $(this.getVariable(query.shift()).listElement).find(
                    '.entryVariableListElementEditWorkspace'
                )[0];
            case 'listEditButton':
                return $(this.getList(query.shift()).listElement).find(
                    '.entryVariableListElementEditWorkspace'
                )[0];
            case 'variableName':
                return this.getVariable(query.shift()).listElement.nameField;
        }
    }

    _clickAddButton(type, doFunc, forceOpen, doNotFocus) {
        const panel = this._getAddPanel(type);
        const panelView = panel.view;
        const panelViewName = panelView.name;
        const value = panelViewName.value.trim();
        if (panel.isOpen && !forceOpen) {
            if (_.isEmpty(value)) {
                panelView.addClass('off');
                panel.isOpen = false;
            } else {
                return doFunc();
            }
        } else {
            panelView.removeClass('off');
            !doNotFocus && Entry.Utils.focusIfNotActive(panelViewName);
            panel.isOpen = true;
        }
    }

    clickVariableAddButton(...args) {
        this._clickAddButton.call(
            this,
            'variable',
            () => {
                Entry.do(
                    'variableContainerAddVariable',
                    new Entry.Variable(this._makeVariableData('variable'))
                );
            },
            ...args
        );
    }

    clickListAddButton(...args) {
        this._clickAddButton.call(
            this,
            'list',
            () => {
                Entry.do(
                    'variableContainerAddList',
                    new Entry.Variable(this._makeVariableData('list'))
                );
            },
            ...args
        );
    }

    clickMessageAddButton(...args) {
        this._clickAddButton.call(
            this,
            'message',
            () => {
                Entry.do(
                    'variableContainerAddMessage',
                    new Entry.Variable(this._makeVariableData('message'))
                );
            },
            ...args
        );
    }

    _makeVariableData(type = 'variable') {
        const { view, info: { isCloud, object } } = this._getAddPanel(type);

        let name = view.name.value.trim();
        if (_.isEmpty(name)) {
            name = Lang.Workspace[type];
        }

        name = this._truncName(name, type, this._maxNameLength);

        const target = `${type}s_`;
        name = this.checkAllVariableName(name, target)
            ? Entry.getOrderedName(name, this[target], 'name_')
            : name;

        return {
            name,
            isCloud,
            object,
            variableType: type,
        };
    }

    applyOption() {
        const { variable, message, list, func } = this._filterTabs;

        process(variable, Entry.variableEnable);
        process(message, Entry.messageEnable);
        process(list, Entry.listEnable);
        process(func, Entry.functionEnable);

        function process(view, value) {
            if (value) {
                view.removeClass('disable');
            } else {
                view.addClass('disable');
            }
            view.disabled = !value;
        }
    }

    setVariableSlidable(v, type, value) {
        //no type changed
        //just return
        if (v.getType() === type) {
            return;
        }

        let newVariable;

        const variables = this.variables_;
        const variableJSON = v.toJSON();

        if (type === 'slide') {
            variableJSON.variableType = type;
            newVariable = new Entry.Variable(variableJSON);
            variables.splice(variables.indexOf(v), 0, newVariable);

            if (newVariable.getValue() < 0) {
                newVariable.setValue(0);
            } else if (newVariable.getValue() > 100) {
                newVariable.setValue(100);
            }
        } else if (type === 'variable') {
            variableJSON.variableType = type;
            if (value !== undefined) {
                variableJSON.value = value;
            }
            newVariable = new Entry.Variable(variableJSON);
            variables.splice(variables.indexOf(v), 0, newVariable);
        }
        this.createVariableView(newVariable);
        this.removeVariable(v);
        this.updateSelectedVariable(newVariable);
        newVariable.generateView();
    }

    _getAddPanel(type = 'variable') {
        return this[`${type}AddPanel`];
    }
};
