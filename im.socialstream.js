(function(jQuery) {
"use strict";

var $ = jQuery;

var IMStream = Echo.App.manifest("IdeaMelt.Apps.SocialStream");

if (Echo.App.isDefined("IdeaMelt.Apps.SocialStream")) return;

IMStream.init = function() {
	if (!this.config.get('imAppkey') || !this.config.get('baseDomain') || !this.config.get('namespace')) return;
	if (this.config.get('debug')) this.log({message: 'stream app initialized'});

	if (this.config.get('app') == "newsfeed") {
		this.config.set('aggregator', true);
		this.config.set('personalize', true);
	}

	else if (this.config.get('app') == "userfeed") {
		this.config.set('aggregator', true);
		this.config.set('personalize', false);
		if(this.config.get('userUrls') == undefined || this.config.get('userUrls')[0] == undefined || this.config.get('userUrls').length > 1) {
			this.log({message: 'user url required'});
			return false;
		}
	}

	else if (this.config.get('app') == "siteticker") {
		this.config.set('aggregator', false);
		this.config.set('personalize', false);
		this.config.set('compact', true);
	}

	this.setQueryUrls();

	if (this.config.get('aggregator')) {this.aggregator()};

	if (this.config.get('personalize')) {
		this.getNewsfeed();
	} else {
		this.render();
		this.ready();
	}
	
	if (this.user.is('logged')) this.userHandler();
};



IMStream.dependencies = [{
	"url": "{config:cdnBaseURL.sdk}/streamserver.pack.js"
}];

IMStream.config = {
	app: undefined,

	imAppkey: undefined,
	baseDomain: undefined,
	namespace: undefined,
	appkey: undefined,

	debug: false,

	liveUpdatesInterval: 5,
	itemsPerPage: 20,
	sortOrder: 'reverseChronological',
	symbolLink: 'http://www.nasdaq.com/symbol/[xxx]/stream',
	metaLayout: 'compact',
	userUrls: false,
	aggregator: true,
	compact: false,
	personalize: true,
	personalizeUrl: false,
	useSecureAPI: false,
	filter: false,
	autoLikeNotifs: false,
	autoReplyNotifs: false
};
 
IMStream.templates.imStream = '<div class="{class:imstream}"></div>';



IMStream.methods.setQueryUrls = function() {
	var baseDomain = this.config.get('baseDomain');
	if (baseDomain.substring(baseDomain.length-1,baseDomain.length) === '/') {
		baseDomain = baseDomain.substring(0,baseDomain.length-1);
	};
	var namespace = this.config.get('namespace');
	var storiesUrl = baseDomain + '/' + namespace + '/stories';
	var pulseUrl = baseDomain + '/pulse';
	this.config.set('storiesUrl', storiesUrl);
	this.config.set('pulseUrl', pulseUrl);
};

IMStream.methods.aggregator = function() {
	var self = this;
	Echo.Events.subscribe({
	    "topic": "Echo.StreamServer.Controls.Stream.onDataReceive",
	    "handler": function(topic, data) {
	    	var query = self.getQuery();
	    	if (query === data.query) { //&& data.type === 'initial'
	    		data.entries = self.aggregate(data);
	    		data.entries = [];
	    	}
	    }
	});
};

IMStream.methods.aggregate = function(data) {
	var result = [];
	var id_cache = [];
	var temp = {}, temp2 = {};

	$.each(data.entries, function(i,item) {
		if (item.provider.name === 'Idea Melt') {;
			var graph = $(item.object.content).data('graph');
			graph.id = item.id;
			var action_object = graph.meta.url + '_' + graph.object['object-slug'] + '_' + graph.action['action-slug'];
			if (!(action_object in temp)) {temp[action_object] = []}
			temp[action_object].push(item);

			var user_action_object = item.actor.id + '_' + graph.object['object-slug'] + '_' + graph.action['action-slug'];
			if (!(user_action_object in temp2)) {temp2[user_action_object] = []}
			temp2[user_action_object].push(item);
		}
	});

	$.each(temp, function(k,v) {
		if (v.length === 1) {
			//result.push(v[0]);
			//id_cache.push(v[0].id);
		} else {
			var item = $.inArray(v[0].id, id_cache) === -1 ? v[0] : v[1];
			var users = [];//$.map(v, function(u) {return u.actor});
			var ids = [];
			var temp_cache = {};
			$.each(v, function(i,u) {
				var graph = $(u.object.content).data('graph');
				var uniq = u.actor.id + '_' + graph.object['object-slug'] + '_' + graph.action['action-slug'] + '_' + graph.meta.url;
				if (!(uniq in temp_cache)) {
					users.push(u.actor);
					ids.push(u.id);
					temp_cache[uniq] = [];
				}
			});
			if (users.length > 1) {
				item['im_aggregate'] = true;
				item['im_aggregate_type'] = 'users';
				item['im_aggregate_users'] = users;
				result.push(item);
				id_cache = id_cache.concat(ids);
			};	
		}
	});	

	$.each(temp2, function(k,v) {
		var item;
		if (v.length === 1) {
			item = v[0];
			if ($.inArray(item.id,id_cache) === -1) {
				result.push(item);
				id_cache.push(item.id);
			}
		} else {
			item = $.inArray(v[0].id, id_cache) === -1 ? v[0] : v[1];
			var agg = [];
			var local_ids = [];
			var temp_cache = {};
			$.each(v, function(i, u) {
				var graph = $(u.object.content).data('graph');
				var uniq = u.actor.id + '_' + graph.object['object-slug'] + '_' + graph.action['action-slug'] + '_' + graph.meta.url;
				if (!(uniq in temp_cache) && $.inArray(u.id, id_cache) === -1) {
					local_ids.push(u.id);
					agg.push($(u.object.content).data('graph'));
					temp_cache[uniq] = [];
				};
			});
			if (agg.length > 1) {
				item['im_aggregate'] = true;
				item['im_aggregate_type'] = 'objects';
				item['im_aggregate_objects'] = agg;
				result.push(item);
				id_cache = id_cache.concat(local_ids);
			} else {
				if ($.inArray(item.id,id_cache) === -1) {
					result.push(item);
					id_cache.push(item.id);
				}
			};
		}
	});

	var unique_result = [];
	var temp_cache = {};

	$.each(result, function(i,item) {
		var graph = $(item.object.content).data('graph');
		var uniq = item.actor.id + '_' + graph.object['object-slug'] + '_' + graph.action['action-slug'] + '_' + graph.meta.url;
		if (!(uniq in temp_cache)) {
			unique_result.push(item);
			temp_cache[uniq] = [];
		}
	});

	var unique_result_ids = $.map(unique_result, function(r) {return r.id});

	$.each(data.entries, function(i,entry) {
		if ($.inArray(entry.id,unique_result_ids) === -1) {entry.im_remove = true};
	});

	if (this.config.get('debug')) this.log({message: unique_result});
	return unique_result;
};

IMStream.methods.userHandler = function() {
	if (Echo.UserSession.is('logged')) {
		if (this.config.get('debug')) this.log({message: 'logged'});
		this.checkUser();
	} else {
		if (this.config.get('debug')) this.log({message: 'not-logged'});
	};
};

IMStream.methods.checkUser = function() {
	if (Echo.UserSession.is('logged')) {
		var url = "https://api.ideamelt.com/v1/user/create/"
		var pic = Echo.UserSession.get('photos');
		var options = {
		   api_key: this.config.get("imAppkey"),
		   user_url: Echo.UserSession.get('identityUrl'),
		   title: Echo.UserSession.get('username'),
		   avatar: pic[0]['value']
	    };
		$.post(url, options);			
	};
	return;
};

IMStream.methods.getElement = function(className, name) {
	var sub = this.cssPrefix + className;
	var target = this.config.get('target');
	if (name) {
		return sub;
	} else {
		return target.find('.' + sub);
	}
};

IMStream.methods.getNewsfeed = function() {
	if (!Echo.UserSession.is('logged') && !this.config.get('personalizeUrl')) {
		this.ready();
		this.render();
		return false;
	}

	var self = this;
	var key = this.config.get('imAppkey');
	if(this.config.get('personalizeUrl')) var identity = this.config.get('personalizeUrl');
	else var identity = Echo.UserSession.get('identityUrl');
	var opts = {api_key: key, user_url: identity};
	var url = 'https://api.ideamelt.com/v1/user/';
	(new Echo.API.Request({
		"apiBaseURL": url,
		"endpoint": "followees",
		"transport": "json",
		"secure": this.config.get('useSecureAPI'),
		"data": opts,
		"onData": function(result) {
			if (!result.success) {
				var users = [identity];
			}
			else {
				var users = $.map(result.followees_list, function(r) {return r.url});
			}
			self.set('newsfeedUrls', users);
			self.ready();
			self.render();
		}
	})).request();
};

IMStream.methods.template = function() {
	return this.templates.imStream;
};

IMStream.methods.getQuery = function() {
	var child = this.config.get('compact') ? ':0' : '';
	var gen = 'user.state:Untouched,ModeratorApproved state:Untouched,ModeratorApproved children'+ child +' user.state:Untouched,ModeratorApproved state:Untouched,ModeratorApproved safeHTML:off';
	var itemsPerPage = this.config.get('itemsPerPage');
	var sortOrder = this.config.get('sortOrder');
	var storiesUrl = this.config.get('storiesUrl');
	var pulseUrl = this.config.get('pulseUrl');
	var namespace = this.config.get('namespace');
	var pulseSource = this.config.get('pulseSource', namespace);

	var users = this.config.get('userUrls');
	
	var userString = '';
	
	if (users instanceof Array && users.length > 0 && users[0].length > 0) {
		var re = $.map(users, function(e) {return '"' + e + '"'});
		userString += re.join(',');
	};

	if(this.config.get('personalize') && this.user.is('logged')) {
		var newsfeedUrls = this.get('newsfeedUrls');
		var rf = $.map(newsfeedUrls, function(e) {return '"' + e + '"'});
		if (userString.length > 0 && newsfeedUrls.length > 0) userString +=  ', ';
		userString += rf.join(',');
	}
	
	if(userString.length > 0) userString = ' user.id:' + userString;

	var initialQuery = '(childrenof:' + storiesUrl + userString + ') OR (childrenof:' + pulseUrl + ' source:' + pulseSource + userString + ')';

	var filter = this.config.get('filter');
	if (filter) {
		filter = filter.toLowerCase();
		if (filter === 'pulse') {
			initialQuery = 'childrenof:' + pulseUrl + ' source:' + pulseSource + userString;
		} else if (filter === 'stories') {
			initialQuery = 'childrenof:' + storiesUrl + userString;
		}
	}

	var query = initialQuery + ' itemsPerPage:' + itemsPerPage + ' sortOrder:' + sortOrder + ' ' + gen;
	return query; 
};

IMStream.methods.autoLikeNotifs = function() {
	var self = this;
	this.events.subscribe({
		"topic": "Echo.StreamServer.Controls.Stream.Item.Plugins.Like.onLikeComplete",
		"handler": function(topic, data) {
			var options = {
				api_key: self.config.get('imAppkey'),
				to_user_url: data.item.data.actor.id,
				from_user_url: self.user.get('identityUrl'),
			}
			if (data.item.data.object.title == undefined) {
				options['content'] = '<a href="' + self.user.get("identityUrl") + '">' + self.user.get('name') + '</a> liked your post<br><i>' + data.item.data.object.content + '</i>';
			}
			else {
				var tmp = $(data.item.data.object.content).data('graph');
				options['content'] = '<a href="' + self.user.get("identityUrl") + '">' + self.user.get('name') + '</a> liked your activity<br><i><a href="' + tmp.meta.url + '">' + data.item.data.object.title + '</a></i>';
			}
			self.sendNotif(options);
		},
	});
}

IMStream.methods.autoReplyNotifs = function() {
	var self = this;
	this.events.subscribe({
		"topic": "Echo.StreamServer.Controls.Submit.onPostComplete",
		"handler": function(topic, data) {
			var options = {
				api_key: self.config.get('imAppkey'),
				to_user_url: data.inReplyTo.actor.id,
				from_user_url: self.user.get('identityUrl')
			};
			if (data.inReplyTo.object.title == undefined) {
				options['content'] = '<a href="' + self.user.get("identityUrl") + '">' + self.user.get('name') + '</a> replied to your post<br><i>' + data.inReplyTo.object.content + '</a></i><br><b>"' + data.postData.content[0].object.content + '"</b>';
			}
			else {
				var tmp = $(data.inReplyTo.object.content).data('graph');
				options['content'] = '<a href="' + self.user.get("identityUrl") + '">' + self.user.get('name') + '</a> replied to your activity<br><i><a href="' + tmp.meta.url + '">' + data.inReplyTo.object.title + '</a></i><br><b>"' + data.postData.content[0].object.content + '"</b>';
			}
			self.sendNotif(options);
		},
	});
}

IMStream.methods.sendNotif = function(options) {
	var self = this;
	var url = 'https://api.ideamelt.com/v1/notifications/';
	(new Echo.API.Request({
		"apiBaseURL": url,
		"endpoint": "send",
		"secure": self.config.get('useSecureAPI'),
		"data": options,
		"onData": function(result) {
			self.log({'message': result})
		}
	})).request();
}

IMStream.renderers.imstream = function(element) {
	var timeout = this.config.get('liveUpdatesInterval');

	var symbolLink = this.config.get('symbolLink');
	var maxChars = this.config.get('maxBodyCharacters');
	var metaLayout = this.config.get('metaLayout');
	var baseDomain = this.config.get('baseDomain');

	var query = this.getQuery();

	var agg = this.config.get('aggregator');
	var compact = this.config.get('compact');

	if (compact) {
		element.addClass('im-compact');
	};

	this.initComponent({
		"id": "Stream",
		"component": "Echo.StreamServer.Controls.Stream",
		"config": {
			"target": element,
			"query": query,
			"plugins": [{
					"name": 'IdeaMeltStreamFull',
					"symbolLink": symbolLink,
					"metaLayout": metaLayout,
					"aggregator": agg,
					"compact": compact
				},
				{"name": 'Like'},
				{"name": 'Reply',
				"actionString": "Write a comment...",
               	"source": {
		            "name": 'IMStream',
		            "uri": baseDomain
		        },
                "nestedPlugins": [{
					"name": "FormAuth",
					"submitPermissions": "forceLogin"
					}]
				}],
			"state": {
				"label": {
					"icon": false,
					"text": false
					}
				},
			"item": {
				"reTag": false,
				"contentTransformations": {
					"text": ["hashtags", "urls", "newlines"],
					"html": ["hashtags", "urls", "newlines"],
					"xhtml": ["hashtags", "urls"]
				}
			},
			"liveUpdates":{"enabled": true, "timeout": timeout},
			"flashColor": "#C6E9F6",
			"fadeTimeout": 6000,
			"useSecureAPI": this.config.get('useSecureAPI')
		}
	});

	if(this.config.get('autoLikeNotifs')) this.autoLikeNotifs();
	if(this.config.get('autoReplyNotifs')) this.autoReplyNotifs();

	return element;
};

IMStream.css ='.{class:imstream} .echo-streamserver-controls-stream-header {display:none;}' + 
	'.im-compact .echo-streamserver-controls-stream-item-footer{display:none}' + 
	'.im-compact .echo-streamserver-controls-stream-item-plugin-Like-likedBy{display:none!important}' + 
	'.im-compact .echo-streamserver-controls-stream-item-subwrapper {margin-left: 42px;}' +
	'.im-compact .echo-streamserver-controls-stream-item-container-root{padding:10px 0; border-bottom:1px solid #eee; font-size:11px}' + 
	'.im-compact .echo-streamserver-controls-stream-item-avatar {width:32px; height:32px}' + 
	'.im-compact .echo-linkColor {color: #333;}';

Echo.App.create(IMStream);
		
})(Echo.jQuery);

//------------------------- IMStream full layout plugin -------------------------//

(function(jQuery) {
"use strict";

var $ = jQuery;
//Plugin name
var plugin = Echo.Plugin.manifest("IdeaMeltStreamFull", "Echo.StreamServer.Controls.Stream.Item");

if (Echo.Plugin.isDefined(plugin)) return;

plugin.init = function() {
	var provider = this.component.get("data.provider.name");
	if (provider === 'Idea Melt') {
		this.extendTemplate("replace", "body", plugin.template);
	} else {
		this.extendTemplate("replace", 'authorName', plugin.authorTemplate);
		this.extendTemplate("replace", 'text', plugin.textTemplate);
	};
	this.extendTemplate("replace", 'avatar', plugin.avatarTemplate);
};

// Plugin template html
plugin.template = function() {
	var compact = this.config.get('metaLayout') === 'compact' ? 'im-compact-meta' : '';
    return '<div class="{plugin.class:im-story-container}"></div>' +
	'<div class="{plugin.class:wrapper} '+ compact +'"></div>';
};

plugin.methods.imObject = function(graph,desc_threshold) {
	var im_object_class = this.cssPrefix + 'im-object';
	var img_class = this.cssPrefix + 'imgholder';
	var text_class = this.cssPrefix + 'text';
	var title_class = this.cssPrefix + 'title';
	var metaurl_class = this.cssPrefix + 'metaurl';
	if(graph.action['action-slug'] == 'comment') var text_frame_class = this.cssPrefix + 'item-comment-frame';
	else var text_frame_class = this.cssPrefix + 'item-text-frame';

	var size = this.config.get('metaLayout') === 'compact' ? 48 : 90;
	var object_url = graph.meta.url;
  	var object_base_domain = object_url.replace('http://','').replace('https://','').replace('www.','').split('/')[0];
  	if(graph.action['action-slug'] == 'comment') var desc = '"' + graph.meta.comment + '"';
  	else var desc = graph.meta.description;

  	if (!desc) {desc = ''};
	if (!desc_threshold) {desc_threshold = 300};
	if (desc.length > desc_threshold) {desc = desc.slice(0,desc_threshold) + '...'};

	var string = '<div class="'+ im_object_class +'">' +
	'<div class="'+ img_class +'"><a target="blank" href="'+ graph.meta.url +'"><img src="'+ graph.meta.image +'" width="'+ size +'" /></a></div>' +
	'<div class="'+ text_class +'">' +
	'<div class="'+ title_class +' echo-linkColor">'+ '<a class="echo-primaryColor" target="_blank" href="' + graph.meta.url + '">' + graph.meta.title + '</a></div>' +
	'<div class="'+ metaurl_class +'"><a href="' + graph.meta.url + '">' + object_base_domain + '</a></div>' +
	'<div class="echo-primaryColor '+ text_frame_class +'">'+ desc +'</div>' +
    '</div></div>';
    return string;
};

plugin.authorTemplate = '<div class="{class:authorName} {plugin.class:authorNameLink}"></div>';
plugin.avatarTemplate = '<div class="{class:avatar} {plugin.class:avatarLink}"></div>';
plugin.textTemplate = '<span class="{class:text} {plugin.class:textSymbol}"></span>';

plugin.renderers.authorNameLink = function(element) {
    var author = this.component.get("data.actor");
    return element.html('<a href="'+ author.id +'">'+ author.title +'</a>');
};

plugin.renderers.textSymbol = function(element) {
	var self = this;
	var tags = element.find('.echo-stock-tag');
	tags.each(function() {
		var sym = $(this).text();
		var symbolLink = self.config.get('symbolLink');
		var url = symbolLink.replace('[xxx]',sym);
		$(this).attr('href', url);
	});
	return element;
};

plugin.renderers.avatarLink = function(element) {
	var itemImage = Echo.Utils.loadImage({
		"image": this.component.data.actor.avatar,
		"defaultImage": this.config.get("defaultAvatar")
	});

	var compact = this.config.get('compact');
	var size = compact ? 32 : 48;

	var depth = this.component.depth;
	if (this.config.get('debug')) this.log({message: depth});
	if (depth) {
		size = 24;
	}

	itemImage.css({'width': size, 'height': size});
	var url = this.component.data.actor.id;
	element.html('<a href="'+ url +'"></a>');
	element.find('a').html(itemImage);

	return element;
};

plugin.renderers.wrapper =function(element) {
	var self = this;
	var stream = this.component;
	var text = stream.view.get("body");
	// here we removes the author name
	stream.view.remove("authorName"); 
	//create json from data

	if (this.component.data.im_remove) {
  		this.component.destroy();
  	}

  	var myObject = $(this.component.data.object.content).data('graph');
  	var object_url = myObject.meta.url;
  	var object_base_domain = object_url.replace('http://','').replace('https://','').replace('www.','').split('/')[0];
	//create image item
	var itemImage = Echo.Utils.loadImage({
		"image": myObject.meta.image,
		"defaultImage": this.config.get("defaultAvatar")
	});
	var size = this.config.get('metaLayout') === 'compact' ? 48 : 90;
	itemImage.css({'width': size, 'height': size});

	//story components
	var story_actor = '<a class="echo-linkColor imstoryactor" target="_blank" style="font-weight:bold;" href="' + this.component.data.actor.id + '">'+ this.component.data.actor.title + '</a>';
	var story_action = myObject.action['action-singular'];
	var story_object = myObject.object['object-determiner'] + ' <a class="echo-linkColor" target="_blank" href="' + myObject.meta.url + '">' + myObject.object['object-singular'] + '.</a>';

	if (this.config.get('compact')) {
		story_object = '<a class="echo-linkColor" target="_blank" href="' + myObject.meta.url + '">' + myObject.meta.title + '.</a>';
	}

	//agg
	var multiple_users = '';
	if (this.component.data.im_aggregate && this.component.data.im_aggregate_type === 'users') {
		var num = this.component.data.im_aggregate_users.length - 1;
		var agg_users = this.component.data.im_aggregate_users.slice(1, num+1);
		var orig_agg = agg_users;
		agg_users = $.map(agg_users, function(r) {return r.title});
		var users_tooltip = agg_users.join(', ');
		multiple_users = num > 1 ? 'and <span rel="tooltip" title="'+ users_tooltip +'" class="im-multiple echo-linkColor">' + num + ' other people</span> ' : 'and <a class="echo-linkColor imstoryactor" target="_blank" style="font-weight:bold;" href="' + orig_agg[0].id + '">'+ orig_agg[0].title + '</a> ';
		story_action = myObject.action['action-plural'];
	};

	var story_objects = [myObject];

	if (this.component.data.im_aggregate && this.component.data.im_aggregate_type === 'objects') {
		var num = this.component.data.im_aggregate_objects.length;
		var titles = $.map(this.component.data.im_aggregate_objects, function(r) {return r.meta.title});
		var tooltip = titles.join(', ');
		var story_object = '<span rel="tooltip" title="'+ tooltip +'" class="echo-linkColor im-multiple">'+ num +' '+ myObject.object['object-plural'] +'</span>';

		var extra_objects = this.component.data.im_aggregate_objects.slice(1,num);
		story_objects = story_objects.concat(extra_objects);
	};

	var imstory = story_actor + ' ' + multiple_users + story_action + ' ' + story_object;

	//add individual items to template html 
	this.view.get("im-story-container").empty().append(imstory);

	var html_objects = '';
	var desc_threshold = null;
	if (story_objects.length > 1) {
		desc_threshold = 140;
	};
	$.each(story_objects, function(i,item) {html_objects += self.imObject(item,desc_threshold)});

	if (!this.config.get('compact',false)) {
		this.view.get('wrapper').empty().append(html_objects);
	} else {
		this.view.get('wrapper').remove();
	}

	return element;
};

plugin.css = 
    '.{plugin.class:imgcontainer} { width:90px;height:90px;padding:5px; }' +
    '.{plugin.class:wrapper} { background-color:#f7f7f7;margin-top:10px; border:1px solid #ccc; min-height:92px; margin-bottom:7px}' +
    '.{plugin.class:imgholder} { float:left; width:90px; height:90px; overflow:hidden}' +
	'.{plugin.class:imgholder} img {width:90px;}' + 
	'.{plugin.class:text} {margin-left:10px; padding-top:5px; margin-left:100px}' +
	'.{plugin.class:title} { font-weight:bold; }' +
	'.{plugin.class:metaurl} {padding:3px 0}' +
	'.{plugin.class:metaurl} a { font-weight:normal; color:#666; font-size:11px;}' + 
	'.{plugin.class:wrapper}.im-compact-meta{ background: none;border: none;min-height: 50px;border-left: 2px solid #DDD;padding-left: 10px;}' + 
	'.{plugin.class:wrapper}.im-compact-meta .{plugin.class:imgholder}{width:48px; height:48px; overflow:hidden}' +
	'.{plugin.class:wrapper}.im-compact-meta .{plugin.class:imgholder} img{width:48px;}' +
	'.{plugin.class:wrapper}.im-compact-meta .{plugin.class:text}{ padding-top: 0px;margin-left: 60px;}' + 
	'.{plugin.class:item-text-frame} {color:#666; font-size:11px}' + 
	'.{plugin.class:item-comment-frame} {font-style: italic;}' + 
	'.im-multiple{cursor:default}' + 
	'.{plugin.class:im-object} {padding-bottom:20px}' + 
	'.{plugin.class:im-object}:last-child {padding-bottom:0px}';
Echo.Plugin.create(plugin);

})(Echo.jQuery);