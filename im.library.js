var IdeaMelt = window.IdeaMelt || {};

IdeaMelt.init = function(config) {
	if (!config || !config.api_key) return false;
	if (config.secure) IdeaMelt.baseUrl = 'https://api.ideamelt.com/v1/';
	else IdeaMelt.baseUrl = 'http://api.ideamelt.com/v1/';
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
	return endpoints;
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
	return message;
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
	// if(!this.checkRequest(endpoint, options)) return false;
	var base = {
			crossDomain: true,
			api_key: IdeaMelt.config.api_key
		},
		data = $.extend(base, options),
		url = this.baseUrl + this.EndPoints[endpoint].url,
		method = this.EndPoints[endpoint].method
	$.ajax({
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
	
	StoryCreate: {
		url: 'story/create/',
		method: 'POST',
		required: ['user_url', 'action_type', 'object_type', 'object_url']},

	UserExists: {
		url: 'user/exists/',
		method: 'GET',
		required: ['user_url']},

	UserCreate: {
		url: 'user/create/',
		method: 'POST',
		required: ['user_url', 'title', 'avatar']},
	
	UserFollow: {
		url: 'user/follow/',
		method: 'POST',
		required: ['user_url'],
		optional: ['user_to_follow', 'object_to_follow']},
	
	UserFollowers: {
		url: 'user/user_followers/',
		method: 'GET',
		required: ['user_url']},
	
	UserFollowing: {
		url: 'user/user_following/',
		method: 'GET',
		required: ['user_url']},

	ObjectsFollowing: {
		url: 'user/objects_following/',
		method: 'GET',
		required: ['user_url']},
	
	IsFollowingUser: {
		url: 'user/is_following_user/',
		method: 'GET',
		required: ['user_url', 'following_user_url']},
	
	IsFollowingObject: {
		url: 'user/is_following_object/',
		method: 'GET',
		required: ['user_url', 'following_object_url']},

	NotifSend: {
		url: 'notifications/send/',
		method: 'POST',
		required: ['to_user_url', 'from_user_url', 'content']},

	NotifSendToFollowers: {
		url: 'notifications/send_to_followers/',
		method: 'POST',
		required: ['from_user_url', 'content']},

	//phasing out
	NotificationsSend: {
		url: 'notifications/send/',
		method: 'POST',
		required: ['to_user_url', 'from_user_url', 'content']},

	//phasing out
	NotificationsSendToFollowers: {
		url: 'notifications/send_to_followers/',
		method: 'POST',
		required: ['from_user_url', 'content']},

	//phasing out
	UserFollowees: {
		url: 'user/followees/',
		method: 'GET',
		required: ['user_url']},

	//phasing out
	ObjectsFollowed: {
		url: 'user/objects_followed/',
		method: 'GET',
		required: ['user_url']},
};








IdeaMelt.EventHooks = {


	RTBComments: {
		notifications: function(app, autoPostNotif, autoLikeNotif, deepLink) {

			if(app.events == undefined) return IdeaMelt.log('error', 'event subscription not possible. check app parameter');

			if(autoPostNotif) {
				app.events.subscribe({
					"topic": "Echo.StreamServer.Controls.Submit.onPostComplete",
					"handler": function(topic, data) {
						if(Echo.UserSession.identity.loggedIn == "true") {
							if(data.inReplyTo != undefined) {
								var options = {
									to_user_url: data.inReplyTo.actor.id,
									from_user_url: Echo.UserSession.get('identityUrl')
								};
								if(deepLink != undefined) options['content'] = '<a href="' + Echo.UserSession.get("identityUrl") + '">' + Echo.UserSession.get('name') + '</a> replied to your post<br><i>' + data.inReplyTo.object.content + '</a></i><br><a href="' + deepLink + '"<b>"' + data.postData.content[0].object.content + '"</b></a>';
								else options['content'] = '<a href="' + Echo.UserSession.get("identityUrl") + '">' + Echo.UserSession.get('name') + '</a> replied to your post<br><i>' + data.inReplyTo.object.content + '</a></i><br><b>"' + data.postData.content[0].object.content + '"</b>';
								IdeaMelt.send('NotificationsSend', options);
							}
						}
					}
				});
			}

			if(autoLikeNotif) {
				app.events.subscribe({
					"topic": "Echo.StreamServer.Controls.Stream.Item.Plugins.Like.onLikeComplete",
					"handler": function(topic, data) {
						if(Echo.UserSession.identity.loggedIn == "true") {
							var options = {
								to_user_url: data.item.data.actor.id,
								from_user_url: Echo.UserSession.get('identityUrl'),
							}
							if(deepLink != undefined) options['content'] = '<a href="' + Echo.UserSession.get("identityUrl") + '">' + Echo.UserSession.get('name') + '</a> liked your post<br><a href="' + deepLink + '"<i>' + data.item.data.object.content + '</i></a>';
							else options['content'] = '<a href="' + Echo.UserSession.get("identityUrl") + '">' + Echo.UserSession.get('name') + '</a> liked your post<br><i>' + data.item.data.object.content + '</i>';
							IdeaMelt.send('NotificationsSend', options);
						}
					}
				});
			}
		},

		stories: function(app, objectType, objectUrl) {

			if(app.events == undefined) return IdeaMelt.log('error', 'event subscription not possible. check app parameter');
			if(objectType == undefined) return IdeaMelt.log('error', 'no objectType provided');
			if(objectUrl == undefined) return IdeaMelt.log('error', 'no objectUrl provided');

			app.events.subscribe({
				"topic": "Echo.StreamServer.Controls.Submit.onPostComplete",
				"handler": function(topic, data) {
					if(Echo.UserSession.identity.loggedIn == "true") {
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
				}
			});
		}
	}

	
}