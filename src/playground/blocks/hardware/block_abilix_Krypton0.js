'use strict';

Entry.Krypton0 = {
    PORT_MAP: {
		'1': undefined,
        '2': undefined,
        '3': undefined,
        '4': undefined,
    },
	SENSOR_PORT_MAP: {
		'A': undefined,
        'B': undefined,
        'C': undefined,
        'D': undefined,
	},
	deviceTypes: {
		NONE:			0x01,
		BUTTON:			0x02,
		GRAY_INFRARED:	0x03,
		LIGHT:			0x07,
		MICROPHONE:		0x08,
		LED:			0x09,
		LMOTOR:			0x0A,
		RMOTOR:			0x0B,

		Initializing:	0x7d,
		WrongPort:		0x7f,
		Unknown:		0xff
	},
	
    timeouts: [],
    removeTimeout: function(id) {
        clearTimeout(id);
        var timeouts = this.timeouts;
        var index = timeouts.indexOf(id);
        if (index >= 0) {
            timeouts.splice(index, 1);
        }
    },
    removeAllTimeouts: function() {
        var timeouts = this.timeouts;
        for (var i in timeouts) {
            clearTimeout(timeouts[i]);
        }
        this.timeouts = [];
    },
    setZero: function() {
        var portMap = this.PORT_MAP;
		var sensor_portmap = this.SENSOR_PORT_MAP;
        Object.keys(portMap).forEach(function(port) {
			//Entry.hw.sendQueue[port] = portMap[port];
			Entry.hw.sendQueue[port] = {
                type: Entry.Krypton0.deviceTypes.NONE,
                port_values: 0,
            };
        });
		
		Object.keys(sensor_portmap).forEach(function(sensor_port) {
			Entry.hw.sendQueue[sensor_port] = {
                type: Entry.Krypton0.deviceTypes.NONE,
                port_values: 0,
            };
		});
        Entry.hw.update();
    },
	
	abilix_controller : {
		MIN_MOTOR_SPEED: -50,
		MAX_MOTOR_SPEED: 50,
		
		check_max_speed: function(speed_value) {
			var adj_speed = speed_value;
			
			if (speed_value > this.MAX_MOTOR_SPEED) {
				adj_speed = this.MAX_MOTOR_SPEED;
			}
			else if (speed_value < this.MIN_MOTOR_SPEED) {
				adj_speed = this.MAX_MOTOR_SPEED;
			}
			else {
				adj_speed = speed_value;
			}

            return adj_speed;
        },
	},
	
    id: '30.1',
    name: 'ABILIX Krypton 0 for School',
    url: 'http://abilix.co.kr',
    imageName: 'abilix_Krypton0.png',
    title: {
        ko: '크립톤 0',
        en: 'Krypton 0 for School',
    },
};

Entry.Krypton0.setLanguage = function() {
    return {
        ko: {
            template: {
				Krypton0_turnon_motor: '모터를 %1(으)로 %2 속도로 움직이기 %3',
				Krypton0_move_to_direction_during_secs : '모터를 %1(으)로 %2 초동안 움직이기 %3',
	
				Krypton0_turnoff_motor : '모터를 정지 시키기 %1',
				Krypton0_change_direction_during_secs : '모터를 %1 방향으로 %2초 동안 움직이기 %3',
				Krypton0_change_speed : '모터 %1의 속도를 %2로 변경하기 %3',
				
				Krypton0_play_sound : '크립톤에서 %1 을 재생하기 %2',

				Krypton0_get_sensor_data: '포트 %1에서 센서 %2 의 값을 읽기',
				
				//Krypton0_get_sensor_value: '센서 %1 의 값을 읽기',
                Krypton0_button_pressed: '포트 %1의 버튼이 눌려져있는가? %2',
				Krypton0_turnon_led: '포트 %1의 LED를 %2 %3',
            },
        },
        en: {
            template: {
				Krypton0_turnon_motor: 'Motors move to %1 as %2 speed %3',
				Krypton0_move_to_direction_during_secs : 'Motors move to %1 during %2 sec %3',
	
				Krypton0_turnoff_motor : 'Stop Motors %1',
				Krypton0_change_direction_during_secs : 'Motors go to %1 during %2 secs %3',
				Krypton0_change_speed : 'Motor change from speed of %1 to %2 %3', 
				
				Krypton0_play_sound : 'Kripton play %1 audio %2',

				Krypton0_get_sensor_data: 'Port %1 read sensor %2 value',
				
                //Krypton0_get_sensor_value: 'Read sensor %1 value',
                Krypton0_button_pressed: 'Port %1 of Button is pressed? %2',
				Krypton0_turnon_led: 'Port %1 of LED Turn %2 %3',		
            },
        },
    };
};

Entry.Krypton0.blockMenuBlocks = [
	'Krypton0_turnon_motor',
    'Krypton0_move_to_direction_during_secs',
	
	'Krypton0_turnoff_motor',
	'Krypton0_change_direction_during_secs',
	'Krypton0_change_speed',
	
	'Krypton0_play_sound',

	'Krypton0_get_sensor_data',
	
	//'Krypton0_get_sensor_value',
	'Krypton0_button_pressed',
	'Krypton0_turnon_led',
];

Entry.Krypton0.getBlocks = function() {
    return {
        //region Krypton0
		/*************************************************************************
		* Name: Krypton0_turnon_motor
		*
		* Description: Turn on Motor.
		*			   "Motors move to %1 as %2 speed %3"
		*************************************************************************/
		Krypton0_turnon_motor : {
            color: EntryStatic.colorSet.block.default.HARDWARE,
            outerLine: EntryStatic.colorSet.block.darken.HARDWARE,
            skeleton: 'basic',
            statements: [],
			params: [
                {
                    type: 'Dropdown',
					options: [['앞', 'Forward'], ['뒤', 'Backward']],
                    value: '앞',
                    fontSize: 11,
                    bgColor: EntryStatic.colorSet.block.darken.HARDWARE,
                    arrowColor: EntryStatic.colorSet.arrow.default.HARDWARE,
                },
				{
                    type: 'Block',
                    accept: 'string',
                    defaultType: 'number',
                },
                {
                    type: 'Indicator',
                    img: 'block_icon/hardware_icon.svg',
                    size: 12,
                },
            ],
            events: {},
            def: {
                params: [
                    null,
                    {
                        type: 'number',
                        params: ['3'],
                    },
                ],
                type: 'Krypton0_turnon_motor',
            },
            paramsKeyMap: {
                DIRECTION: 0,
                VALUE_SPD: 1,
            },
            class: 'Krypton0_motor_control',
            isNotFor: ['ABILIX Krypton 0 for School'],
            func: function(sprite, script) {
				var direction = script.getStringField('DIRECTION', script);
				var speedValue = script.getNumberValue('VALUE_SPD');
				if (direction == 'Forward') {
					speedValue = Entry.Krypton0.abilix_controller.check_max_speed(speedValue);
				}
				else {
					speedValue = Entry.Krypton0.abilix_controller.check_max_speed(speedValue * -1);
				}
				Entry.hw.sendQueue.LMOTOR = speedValue;
				Entry.hw.sendQueue.RMOTOR = speedValue;
                return script.callReturn();
            },
		},
		
		/*************************************************************************
		* Name: Krypton0_move_to_direction_during_secs
		*
		* Description: Moter move to Forward / Backword during some sec.
		*			   "Motors move to %1 during %2 sec %3"
		*************************************************************************/
		Krypton0_move_to_direction_during_secs : {
            color: EntryStatic.colorSet.block.default.HARDWARE,
            outerLine: EntryStatic.colorSet.block.darken.HARDWARE,
            skeleton: 'basic',
            statements: [],
			params: [
                {
                    type: 'Dropdown',
					options: [['앞', 'Forward'], ['뒤', 'Backward']],
                    value: '앞',
                    fontSize: 11,
                    bgColor: EntryStatic.colorSet.block.darken.HARDWARE,
                    arrowColor: EntryStatic.colorSet.arrow.default.HARDWARE,
                },
				{
                    type: 'Block',
                    accept: 'string',
                    defaultType: 'number',
                },
                {
                    type: 'Indicator',
                    img: 'block_icon/hardware_icon.svg',
                    size: 12,
                },
            ],
            events: {},
            def: {
                params: [
                    null,
                    {
                        type: 'number',
                        params: ['3'],
                    },
                ],
                type: 'Krypton0_move_to_direction_during_secs',
            },
            paramsKeyMap: {
                DIRECTION: 0,
                VALUE_SEC: 1,
            },
            class: 'Krypton0_motor_control',
            isNotFor: ['ABILIX Krypton 0 for School'],
            func: function(sprite, script) {
                if (!script.isStart) {
					var direction = script.getStringField('DIRECTION', script);
                    script.isStart = true;
                    script.timeFlag = 1;
					if (direction == 'Forward') {
						Entry.hw.sendQueue.LMOTOR = 30;
						Entry.hw.sendQueue.RMOTOR = 30;
					}
					else {
						Entry.hw.sendQueue.LMOTOR = -30;
						Entry.hw.sendQueue.RMOTOR = -30;
					}
                 
                    var timeValue = script.getNumberValue('VALUE_SEC') * 1000;
                    var timer = setTimeout(function() {
                        script.timeFlag = 0;
                        Entry.Krypton0.removeTimeout(timer);
                    }, timeValue);
                    Entry.Krypton0.timeouts.push(timer);
                    return script;
                } else if (script.timeFlag == 1) {
                    return script;
                } else {
                    delete script.isStart;
                    delete script.timeFlag;
                    Entry.engine.isContinue = false;
                    Entry.hw.sendQueue.LMOTOR = 0;
                    Entry.hw.sendQueue.RMOTOR = 0;
                    return script.callReturn();
                }
            },
		},			
		
		/*************************************************************************
		* Name: Krypton0_turnoff_motor
		*
		* Description: Turn off motor.
		*			   "Stop Motors %1"
		*************************************************************************/
		Krypton0_turnoff_motor : {
            color: EntryStatic.colorSet.block.default.HARDWARE,
            outerLine: EntryStatic.colorSet.block.darken.HARDWARE,
            skeleton: 'basic',
            statements: [],
            params: [
                {
                    type: 'Indicator',
                    img: 'block_icon/hardware_icon.svg',
                    size: 12,
                },
            ],
            events: {},
            def: {
                params: [null],
                type: 'Krypton0_turnoff_motor',
            },
            class: 'Krypton0_motor_control',
            isNotFor: ['ABILIX Krypton 0 for School'],
            func: function(sprite, script) {
                Entry.hw.sendQueue.LMOTOR = 0;
                Entry.hw.sendQueue.RMOTOR = 0;
                return script.callReturn();
            },
        },
		
		/*************************************************************************
		* Name: Krypton0_change_direction_during_secs
		*
		* Description: Turn left or right during some sec.
		*			   "Motors go to %1 during %2 secs %3"
		*************************************************************************/
		Krypton0_change_direction_during_secs: {
            color: EntryStatic.colorSet.block.default.HARDWARE,
            outerLine: EntryStatic.colorSet.block.darken.HARDWARE,
            skeleton: 'basic',
            statements: [],
            params: [
                {
                    type: 'Dropdown',
                    options: [
                        ['왼쪽', 'LEFT'],
                        ['오른쪽', 'RIGHT'],
                    ],
                    value: 'LEFT',
                    fontSize: 11,
                    bgColor: EntryStatic.colorSet.block.darken.HARDWARE,
                    arrowColor: EntryStatic.colorSet.arrow.default.HARDWARE,
                },
                {
                    type: 'Block',
                    accept: 'string',
                },
                {
                    type: 'Indicator',
                    img: 'block_icon/hardware_icon.svg',
                    size: 12,
                },
            ],
            events: {},
            def: {
                params: [
                    null,
                    {
                        type: 'text',
                        params: ['1'],
                    },
                ],
                type: 'Krypton0_change_direction_during_secs',
            },
            paramsKeyMap: {
                DIRECTION: 0,
                VALUE: 1,
            },
            class: 'Krypton0_motor_control',
            isNotFor: ['ABILIX Krypton 0 for School'],
            func: function(sprite, script) {
                if (!script.isStart) {
                    script.isStart = true;
                    script.timeFlag = 1;
                    var direction = script.getField('DIRECTION', script);
                    if (direction == 'LEFT') {
                        Entry.hw.sendQueue.LMOTOR = -30;
                        Entry.hw.sendQueue.RMOTOR = 30;
                    } else {
                        Entry.hw.sendQueue.LMOTOR = 30;
                        Entry.hw.sendQueue.RMOTOR = -30;
                    }
                    var timeValue = script.getNumberValue('VALUE') * 1000;
                    var timer = setTimeout(function() {
                        script.timeFlag = 0;
                        Entry.Krypton0.removeTimeout(timer);
                    }, timeValue);
                    Entry.Krypton0.timeouts.push(timer);
                    return script;
                } else if (script.timeFlag == 1) {
                    return script;
                } else {
                    delete script.isStart;
                    delete script.timeFlag;
                    Entry.engine.isContinue = false;
                    Entry.hw.sendQueue.LMOTOR = 0;
                    Entry.hw.sendQueue.RMOTOR = 0;
                    return script.callReturn();
                }
            },
        },
		
		/*************************************************************************
		* Name: Krypton0_change_speed
		*
		* Description: change motor speed about left, right and both.
		*			   "Motor change from speed of %1 to %2 %3"
		*************************************************************************/
		Krypton0_change_speed: {
            color: EntryStatic.colorSet.block.default.HARDWARE,
            outerLine: EntryStatic.colorSet.block.darken.HARDWARE,
            skeleton: 'basic',
            statements: [],
            params: [
                {
                    type: 'Dropdown',
                    options: [
                        ['A', 'LEFT'],
                        ['B', 'RIGHT'],
                        ['양쪽', 'BOTH'],
                    ],
                    value: 'BOTH',
                    fontSize: 11,
                    bgColor: EntryStatic.colorSet.block.darken.HARDWARE,
                    arrowColor: EntryStatic.colorSet.arrow.default.HARDWARE,
                },
                {
                    type: 'Block',
                    accept: 'string',
                },
                {
                    type: 'Indicator',
                    img: 'block_icon/hardware_icon.svg',
                    size: 12,
                },
            ],
            events: {},
            def: {
                params: [
                    null,
                    {
                        type: 'text',
                        params: ['10'],
                    },
                ],
                type: 'Krypton0_change_speed',
            },
            paramsKeyMap: {
                DIRECTION: 0,
                VALUE: 1,
            },
            class: 'Krypton0_motor_control',
            isNotFor: ['ABILIX Krypton 0 for School'],
            func: function(sprite, script) {
                var direction = script.getField('DIRECTION');
                var value = script.getNumberValue('VALUE'); //Entry.Krypton0.abilix_controller.check_max_speed(script.getNumberValue('VALUE'));
                if (direction == 'LEFT') {
                    Entry.hw.sendQueue.LMOTOR = value;
					Entry.hw.sendQueue.RMOTOR = Entry.hw.sendQueue.RMOTOR != undefined ? Entry.hw.sendQueue.RMOTOR : 0;
                } else if (direction == 'RIGHT') {
					Entry.hw.sendQueue.LMOTOR = Entry.hw.sendQueue.LMOTOR != undefined ? Entry.hw.sendQueue.LMOTOR : 0;
                    Entry.hw.sendQueue.RMOTOR = value;
                } else {
                    Entry.hw.sendQueue.LMOTOR = value;
                    Entry.hw.sendQueue.RMOTOR = value;
                }
                return script.callReturn();
            },
        },
		
		/*************************************************************************
		* Name: Krypton0_play_sound
		*
		* Description: play internal sound - hello, by, welcom, cheer.
		*			   "Kripton play %1 audio %2"
		*************************************************************************/
		Krypton0_play_sound : {
			color: EntryStatic.colorSet.block.default.HARDWARE,
            outerLine: EntryStatic.colorSet.block.darken.HARDWARE,
            skeleton: 'basic',
            statements: [],
            params: [
                {
                    type: 'Dropdown',
                    options: [
                        ['hello', 'hello'],
                        ['bye', 'bye'],
                        ['welcome', 'welcome'],
						['cheer', 'cheer'],
                    ],
                    value: 'hello',
                    fontSize: 11,
                    bgColor: EntryStatic.colorSet.block.darken.HARDWARE,
                    arrowColor: EntryStatic.colorSet.arrow.default.HARDWARE,
                },
                {
                    type: 'Indicator',
                    img: 'block_icon/hardware_icon.svg',
                    size: 12,
                },
            ],
            events: {},
            def: {
                params: [ null ],
                type: 'Krypton0_play_sound',
            },
            paramsKeyMap: {
                SOUND_VALUE: 0,
            },
			class: 'Krypton0_motor_control',
			isNotFor: ['ABILIX Krypton 0 for School'],
            func: function(sprite, script) {
                var audio_file = script.getField('SOUND_VALUE');
				Entry.hw.sendQueue.INTERSND = audio_file;
                return script.callReturn();
            },
        },
		
		/*************************************************************************
		* Name: Krypton0_get_sensor_data
		*
		* Description: Get sensor values - GRAY_INFRARED, ULTRASONIC, 
		*                                  COLOR, LIGHT, MICROPHONE, LANTERN, BUTTON
		*			   "Port %1 read sensor %2 value"
		*************************************************************************/
		Krypton0_get_sensor_data : {
            color: EntryStatic.colorSet.block.default.HARDWARE,
            outerLine: EntryStatic.colorSet.block.darken.HARDWARE,
            skeleton: 'basic_string_field',
            statements: [],
            params: [
				{
                    type: 'Dropdown',
                    options: [
                        ['1', '1'],
                        ['2', '2'],
						['3', '3'],
						['4', '4'],
                    ],
                    value: '1',
                    fontSize: 11,
                    bgColor: EntryStatic.colorSet.block.darken.HARDWARE,
                    arrowColor: EntryStatic.colorSet.arrow.default.HARDWARE,
                },
                {
                    type: 'Dropdown',
                    options: [
                        ['적외선', 'GRAY_INFRARED'],
                        ['빛', 'LIGHT'],
                        ['소리센서', 'MICROPHONE'],
                        ['LED', 'LED'],
						['버튼', 'BUTTON'],
                    ],
                    value: 'GRAY_INFRARED',
                    fontSize: 11,
                    bgColor: EntryStatic.colorSet.block.darken.HARDWARE,
                    arrowColor: EntryStatic.colorSet.arrow.default.HARDWARE,
                },
            ],
            events: {},
            def: {
                params: [
					null,
					null
				],
                type: 'Krypton0_get_sensor_data',
            },
            paramsKeyMap: {
				PORT: 0,
                DEVICE: 1,
            },
            class: 'Krypton0_sensor',
            isNotFor: ['ABILIX Krypton 0 for School'],
            func: function(sprite, script) {
				var port = script.getField('PORT');
				var dev = script.getField('DEVICE');
                var port_data; 
                var dev_type;
				
				switch (port) {
					case '1' : port_data = Entry.hw.getDigitalPortValue('A');
					break;
					case '2' : port_data = Entry.hw.getDigitalPortValue('B');
					break;
					case '3' : port_data = Entry.hw.getDigitalPortValue('C');
					break;
					case '4' : port_data = Entry.hw.getDigitalPortValue('D');
					break;
				}
				
				switch(dev) {
					case 'GRAY_INFRARED' :
						dev_type = Entry.Krypton0.deviceTypes.GRAY_INFRARED;
						break;
					case 'LIGHT' :
						dev_type = Entry.Krypton0.deviceTypes.LIGHT;
						break;
					case 'MICROPHONE' :
						dev_type = Entry.Krypton0.deviceTypes.MICROPHONE;
						break;
					case 'LED' :
						dev_type = Entry.Krypton0.deviceTypes.LED;
						break;
					case 'BUTTON' :
						dev_type = Entry.Krypton0.deviceTypes.BUTTON;
						break;
					default:
						break;
				}
					
				console.log('Port = ' + port + '  Dev = ' + dev + '  type = '+ dev_type + '  => Received Dev = ' + port_data.type + '   values = ' + port_data.port_values);
				if (port_data.type == dev_type) {
					return port_data.port_values.toString();
				}
				else
				{
					console.log('Krypton0_get_sensor_value : differenct dev type');
					return '';
				}
            },
        },
		
		/*************************************************************************
		* Name: Krypton0_get_sensor_value
		*
		* Description: Get sensor values - GRAY_INFRARED, ULTRASONIC, 
		*                                  COLOR, LIGHT, MICROPHONE, LANTERN.
		*			   "Read sensor %1s value'"
		*************************************************************************/
/*
		Krypton0_get_sensor_value : {
            color: EntryStatic.colorSet.block.default.HARDWARE,
            outerLine: EntryStatic.colorSet.block.darken.HARDWARE,
            skeleton: 'basic_string_field',
            statements: [],
            params: [
                {
                    type: 'Dropdown',
                    options: [
                        ['적외선1', 'GRAY_INFRARED1'],
						['적외선2', 'GRAY_INFRARED2'],
                        ['빛', 'LIGHT'],
                        ['소리센서', 'MICROPHONE'],
                        ['LED', 'LED'],
                    ],
                    value: 'GRAY_INFRARED1',
                    fontSize: 11,
                    bgColor: EntryStatic.colorSet.block.darken.HARDWARE,
                    arrowColor: EntryStatic.colorSet.arrow.default.HARDWARE,
                },
            ],
            events: {},
            def: {
                params: [null],
                type: 'Krypton0_get_sensor_value',
            },
            paramsKeyMap: {
                DEVICE: 0,
            },
            class: 'Krypton0_sensor',
            isNotFor: ['ABILIX Krypton 0 for School'],
            func: function(sprite, script) {
				var dev = script.getField('DEVICE')
                var sensor_value = Entry.hw.getDigitalPortValue(dev);
                 
				//console.log('Krypton0_get_sensor_value : ' + dev + '   ' + sensor_value);
				if (sensor_value == undefined)
					return '';
				
                return sensor_value.toString();
            },
		},
*/	
		/*************************************************************************
		* Name: Krypton0_button_pressed
		*
		* Description: Is Button pressed?.
		*			   "Port %1 of Button is pressed? %2"
		*************************************************************************/
		Krypton0_button_pressed : {
            color: EntryStatic.colorSet.block.default.HARDWARE,
            outerLine: EntryStatic.colorSet.block.darken.HARDWARE,
            fontColor: '#fff',
            skeleton: 'basic_boolean_field',
            statements: [],
            params: [
				{
                    type: 'Dropdown',
                    options: [
                        ['1', '1'],
                        ['2', '2'],
						['3', '3'],
						['4', '4'],
                    ],
                    value: '1',
                    fontSize: 11,
                    bgColor: EntryStatic.colorSet.block.darken.HARDWARE,
                    arrowColor: EntryStatic.colorSet.arrow.default.HARDWARE,
                },
                {
                    type: 'Indicator',
                    img: 'block_icon/hardware_icon.svg',
                    size: 12,
                },
            ],
            events: {},
            def: {
                params: [null],
                type: 'Krypton0_button_pressed',
            },
            paramsKeyMap: {
				PORT: 0
            },
            class: 'Krypton0_sensor',
            isNotFor: ['ABILIX Krypton 0 for School'],
            func: function(sprite, script) {
				var port = script.getField('PORT');
				var port_data; 
                var dev_type;
				
				switch (port) {
					case '1' : port_data = Entry.hw.getDigitalPortValue('A');
					break;
					case '2' : port_data = Entry.hw.getDigitalPortValue('B');
					break;
					case '3' : port_data = Entry.hw.getDigitalPortValue('C');
					break;
					case '4' : port_data = Entry.hw.getDigitalPortValue('D');
					break;
				}
				
				if (port_data.type == Entry.Krypton0.deviceTypes.BUTTON) {
					if (port_data.port_values == 1) {
						console.log('Krypton0_button_pressed')
						return true;
					}
				}
				else
				{
					console.log('Krypton0_get_sensor_data : differenct dev type');
				}

                return false;
            },
		},			
		
		/*************************************************************************
		* Name: Krypton0_turnon_led
		*
		* Description: Turn on / off LED
		*			   "Port %1 of LED Turn %2 %3"
		*************************************************************************/
		Krypton0_turnon_led : {
            color: EntryStatic.colorSet.block.default.HARDWARE,
            outerLine: EntryStatic.colorSet.block.darken.HARDWARE,
            fontColor: '#fff',
            skeleton: 'basic',
            statements: [],
            params: [
                {
                    type: 'Dropdown',
                    options: [
                        ['1', '1'],
                        ['2', '2'],
						['3', '3'],
						['4', '4'],
                    ],
                    value: '1',
                    fontSize: 11,
                    bgColor: EntryStatic.colorSet.block.darken.HARDWARE,
                    arrowColor: EntryStatic.colorSet.arrow.default.HARDWARE,
                },
                {
                    type: 'Dropdown',
                    options: [
                        ['켠다', 'ON'],
                        ['끈다', 'OFF'],
                    ],
                    value: 'ON',
                    fontSize: 11,
                    bgColor: EntryStatic.colorSet.block.darken.HARDWARE,
                    arrowColor: EntryStatic.colorSet.arrow.default.HARDWARE,
                },
				{
                    type: 'Indicator',
                    img: 'block_icon/hardware_icon.svg',
                    size: 12,
                },
            ],
            events: {},
            def: {
                params: [null, null],
                type: 'Krypton0_turnon_led',
            },
            paramsKeyMap: {
				PORT: 0,
                LED_VALUE: 1,
            },
			class: 'Krypton0_sensor',
            isNotFor: ['ABILIX Krypton 0 for School'],
            func: function(sprite, script) {
				var port = script.getField('PORT');
				var led_value = script.getField('LED_VALUE');
				var port_value;
				
				console.log('Krypton0_turnon_led : ' + led_value);
				if (led_value == 'ON')
					port_value = 0;
				else
					port_value = 1;
				
				Entry.hw.sendQueue[port] = {
                    type: Entry.Krypton0.deviceTypes.LED,
                    port_values: port_value,
                };
				return script.callReturn();
            },
		},
        //endregion
    };
};

module.exports = Entry.Krypton0;
