var IdeaMelt = window.IdeaMelt || {};

IdeaMelt.init = function(config) {
	if (!config || !config.api_key) return false;
	IdeaMelt.config = config;
	return true;
};



(function() {
	var method;
	var noop = function noop() {};
	var methods = [
	    'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
	    'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
	    'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
	    'timeStamp', 'trace', 'warn'
	];
	var length = methods.length;
	var console = (window.console = window.console || {});

	while (length--) {
	    method = methods[length];

	    // Only stub undefined methods.
	    if (!console[method]) {
	        console[method] = noop;
	    }
	}
}());



IdeaMelt.messageLog = {
	'info' : [],
	'error' : []
};

IdeaMelt.baseUrl = 'http://api.ideamelt.com/v1/';

IdeaMelt.log = function(type, message) {
	this.messageLog[type].push(message);
	console.log(message);
	if(type === 'error') return false;
}

IdeaMelt.listEndPoints = function() {
	var endpoints = [];
	$.each(this.EndPoints, function(i) {
		endpoints.push(i);
	});
	this.log('info', endpoints);
}

IdeaMelt.listEndPointParameters = function(endpoint) {
	var required = this.EndPoints[endpoint].required;
	var message = {
		'required' : required
	}
	if (this.EndPoints[endpoint].optional) {
		var optional = this.EndPoints[endpoint].optional;
		message['optional'] = optional;
	}
	this.log('info', message)
}

IdeaMelt.checkRequest = function(endpoint, options) {
	if (!endpoint) return this.log('error', 'no endpoint given');
	if (!this.EndPoints[endpoint]) return this.log('error', 'not a valid endpoint')
	if (!options) return this.log('error', 'no options given');
	var required = this.EndPoints[endpoint].required;
	var complete = true;
	$.each(required, function(i) {
		if(!options[required[i]]) complete = false;
	});
	if (!complete) return this.log('error', '[' + required + '] are required fields')
	if (this.EndPoints[endpoint].optional) {
		var optional = this.EndPoints[endpoint].optional;
		if (options[optional[0]] && options[optional[1]]) return this.log('error', 'only one of [' + optional + '] are allowed');
		if (!options[optional[0]] && !options[optional[1]]) return this.log('error', 'atleast one of [' + optional + '] are required');
	}
	return true;
}

IdeaMelt.send = function(endpoint, options, success, fail) {
	if(!this.checkRequest(endpoint, options)) return false;
	var base = {
			crossDomain: true,
			api_key: IdeaMelt.config.api_key
		},
		data = $.extend(base, options),
		url = this.baseUrl + this.EndPoints[endpoint].url,
		method = this.EndPoints[endpoint].method
	return $.ajax({
		type: method,
		url: url,
		dataType: 'json',
		data: data,
		success: function(result) {
			if (result.success && success) success(result);
			if (!result.success && fail) fail(result);
		},
		error: function(result) {
			if (fail) fail(result);
		}
	});
};



IdeaMelt.EndPoints = {
	
	UserCreate: {
		url: 'user/create/',
		method: 'POST',
		required: ['user_url', 'title', 'avatar']},
	
	UserFollow: {
		url: 'user/follow/',
		method: 'POST',
		required: ['follower_url'],
		optional: ['followee_url', 'object_url']},
	
	StoryCreate: {
		url: 'story/create/',
		method: 'POST',
		required: ['user_url', 'action_type', 'object_type', 'object_url']},
	
	UserExists: {
		url: 'user/exists/',
		method: 'GET',
		required: ['user_url']},
	
	UserFollowers: {
		url: 'user/followers/',
		method: 'GET',
		required: ['user_url']},
	
	UserFollowees: {
		url: 'user/followees/',
		method: 'GET',
		required: ['user_url']},
	
	IsFollowingUser: {
		url: 'user/is_following_user/',
		method: 'GET',
		required: ['user_url', 'followee_url']},
	
	ObjectsFollowed: {
		url: 'user/objects_followed/',
		method: 'GET',
		required: ['user_url']},
	
	IsFollowingObject: {
		url: 'user/is_following_object/',
		method: 'GET',
		required: ['user_url', 'object_url']},

	NotificationsSend: {
		url: 'notifications/send/',
		method: 'POST',
		required: ['to_user_url', 'from_user_url', 'content']},

	NotificationsSendToFollowers: {
		url: 'notifications/send_followers/',
		method: 'POST',
		required: ['from_user_url', 'content']},
};








IdeaMelt.Listen = {}

IdeaMelt.Listen.rtbComments = function(app, objectType, objectUrl) {

	app.components.Submit.events.subscribe({
		"topic": "Echo.StreamServer.Controls.Submit.onPostComplete",
		"handler": function(topic, data) {
			var commentData = data.postData.content[0].object.content;
			var options = {
				user_url: Echo.UserSession.get('identityUrl'),
				action_type: 'comment',
				object_type: objectType,
				object_url: objectUrl,
				comment: commentData
			}
			IdeaMelt.send('StoryCreate', options)
		}
	});
}






















