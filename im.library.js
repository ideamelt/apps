var IdeaMelt = window.IdeaMelt || {};

IdeaMelt.init = function(config) {
	if (!config || !config.api_key) return false;
	this.config = config;
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



IdeaMelt.baseUrl = 'http://api.ideamelt.com/v1/';

IdeaMelt.error = function(message) {
	console.log(message);
	return false;
}

IdeaMelt.listEndPoints = function() {
	$.each(this.EndPoints, function(i) {
		console.log(i);
	});
}

IdeaMelt.listEndPointParameters = function(endpoint) {
	console.log('required paramters: ' + this.EndPoints[endpoint].required);
	if (this.EndPoints[endpoint].optional) {
		console.log('optional paramters: ' + this.EndPoints[endpoint].optional);
	};
}

IdeaMelt.checkRequest = function(endpoint, options) {
	if (!endpoint) return this.error('no endpoint given');
	if (!this.EndPoints[endpoint]) return this.error('not a valid endpoint')
	if (!options) return this.error('no options given');
	var required = this.EndPoints[endpoint].required;
	var complete = true;
	$.each(required, function(i) {
		if(!options[required[i]]) complete = false;
	});
	if (!complete) return this.error('[' + required + '] are required fields')
	if (this.EndPoints[endpoint].optional) {
		var optional = this.EndPoints[endpoint].optional;
		if (options[optional[0]] && options[optional[1]]) return this.error('only one of [' + optional + '] are allowed');
		if (!options[optional[0]] && !options[optional[1]]) return this.error('atleast one of [' + optional + '] are required');
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
			if (result.success && pass) success(result);
			if (!result.success && fail) success(result);
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
		required: ['user_url', 'title', 'avatar']},
	
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
};