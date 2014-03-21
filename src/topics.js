"use strict";

var async = require('async'),
	gravatar = require('gravatar'),
	path = require('path'),
	nconf = require('nconf'),
	validator = require('validator'),
	S = require('string'),
	winston = require('winston'),

	db = require('./database'),
	posts = require('./posts'),
	utils = require('./../public/src/utils'),
	plugins = require('./plugins'),
	user = require('./user'),
	categories = require('./categories'),
	categoryTools = require('./categoryTools'),
	posts = require('./posts'),
	threadTools = require('./threadTools'),
	postTools = require('./postTools'),
	notifications = require('./notifications'),
	favourites = require('./favourites'),
	meta = require('./meta'),
	Plugins = require('./plugins'),
	emitter = require('./emitter');

(function(Topics) {

	require('./topics/unread')(Topics);
	require('./topics/fork')(Topics);

	Topics.create = function(data, callback) {
		var uid = data.uid,
			title = data.title,
			cid = data.cid,
			thumb = data.thumb;

		db.incrObjectField('global', 'nextTid', function(err, tid) {
			if(err) {
				return callback(err);
			}

			var slug = tid + '/' + utils.slugify(title),
				timestamp = Date.now();

			var topicData = {
				'tid': tid,
				'uid': uid,
				'cid': cid,
				'title': title,
				'slug': slug,
				'timestamp': timestamp,
				'lastposttime': 0,
				'postcount': 0,
				'viewcount': 0,
				'locked': 0,
				'deleted': 0,
				'pinned': 0
			};

			if(thumb) {
				topicData.thumb = thumb;
			}

			db.setObject('topic:' + tid, topicData, function(err) {
				if(err) {
					return callback(err);
				}

				db.sortedSetAdd('topics:tid', timestamp, tid);
				Plugins.fireHook('action:topic.save', tid);

				user.addTopicIdToUser(uid, tid, timestamp);

				db.sortedSetAdd('categories:' + cid + ':tid', timestamp, tid);
				db.incrObjectField('category:' + cid, 'topic_count');
				db.incrObjectField('global', 'topicCount');

				callback(null, tid);
			});
		});
	};

	Topics.post = function(data, callback) {
		var uid = data.uid,
			title = data.title,
			content = data.content,
			cid = data.cid,
			thumb = data.thumb;

		if (title) {
			title = title.trim();
		}

		if (!title || title.length < parseInt(meta.config.minimumTitleLength, 10)) {
			return callback(new Error('title-too-short'));
		} else if(title.length > parseInt(meta.config.maximumTitleLength, 10)) {
			return callback(new Error('title-too-long'));
		}

		if (content) {
			content = content.trim();
		}

		if (!content || content.length < meta.config.miminumPostLength) {
			return callback(new Error('content-too-short'));
		}

		if (!cid) {
			return callback(new Error('invalid-cid'));
		}

		async.waterfall([
			function(next) {
				categoryTools.exists(cid, next);
			},
			function(categoryExists, next) {
				if (!categoryExists) {
					return next(new Error('category doesn\'t exist'));
				}
				categoryTools.privileges(cid, uid, next);
			},
			function(privileges, next) {
				if(!privileges.write) {
					return next(new Error('no-privileges'));
				}
				next();
			},
			function(next) {
				user.isReadyToPost(uid, next);
			},
			function(next) {
				Topics.create({uid: uid, title: title, cid: cid, thumb: thumb}, next);
			},
			function(tid, next) {
				Topics.reply({uid:uid, tid:tid, content:content}, next);
			},
			function(postData, next) {
				threadTools.toggleFollow(postData.tid, uid);
				next(null, postData);
			},
			function(postData, next) {
				Topics.getTopicsByTids([postData.tid], uid, function(err, topicData) {
					if(err) {
						return next(err);
					}
					if(!topicData || !topicData.length) {
						return next(new Error('no-topic'));
					}
					topicData = topicData[0];
					topicData.unreplied = 1;

					next(null, {
						topicData: topicData,
						postData: postData
					});
				});
			}
		], callback);
	};

	Topics.reply = function(data, callback) {
		var tid = data.tid,
			uid = data.uid,
			toPid = data.toPid,
			content = data.content,
			privileges,
			postData;

		async.waterfall([
			function(next) {
				threadTools.exists(tid, next);
			},
			function(topicExists, next) {
				if (!topicExists) {
					return next(new Error('topic doesn\'t exist'));
				}

				Topics.isLocked(tid, next);
			},
			function(locked, next) {
				if (locked) {
					return next(new Error('topic-locked'));
				}

				threadTools.privileges(tid, uid, next);
			},
			function(privilegesData, next) {
				privileges = privilegesData;
				if (!privileges.write) {
					return next(new Error('no-privileges'));
				}
				next();
			},
			function(next) {
				user.isReadyToPost(uid, next);
			},
			function(next) {
				if (content) {
					content = content.trim();
				}

				if (!content || content.length < meta.config.minimumPostLength) {
					return next(new Error('content-too-short'));
				}

				posts.create({uid:uid, tid:tid, content:content, toPid:toPid}, next);
			},
			function(data, next) {
				postData = data;
				threadTools.notifyFollowers(tid, postData.pid, uid);

				user.notifications.sendPostNotificationToFollowers(uid, tid, postData.pid);

				next();
			},
			function(next) {
				Topics.markAsUnreadForAll(tid, next);
			},
			function(next) {
				Topics.markAsRead(tid, uid, next);
			},
			function(next) {
				Topics.pushUnreadCount();
				posts.addUserInfoToPost(postData, next);
			},
			function(postData,next) {
				posts.getPidIndex(postData.pid, next);
			},
			function(index, next) {
				postData.index = index;
				postData.favourited = false;
				postData.votes = 0;
				postData.display_moderator_tools = true;
				postData.display_move_tools = privileges.admin || privileges.moderator;
				postData.relativeTime = utils.toISOString(postData.timestamp);

				next(null, postData);
			}
		], callback);
	};

	Topics.getTopicData = function(tid, callback) {
		Topics.getTopicsData([tid], function(err, topics) {
			if (err) {
				return callback(err);
			}

			callback(null, topics ? topics[0] : null);
		});
	};

	Topics.getTopicsData = function(tids, callback) {
		var keys = [];

		for (var i=0; i<tids.length; ++i) {
			keys.push('topic:' + tids[i]);
		}

		db.getObjects(keys, function(err, topics) {
			if (err) {
				return callback(err);
			}

			for (var i=0; i<tids.length; ++i) {
				if(topics[i]) {
					topics[i].title = validator.escape(topics[i].title);
					topics[i].relativeTime = utils.toISOString(topics[i].timestamp);
				}
			}

			callback(null, topics);
		});
	};

	Topics.getTopicDataWithUser = function(tid, callback) {
		Topics.getTopicData(tid, function(err, topic) {
			if (err || !topic) {
				return callback(err || new Error('topic doesn\'t exist'));
			}

			user.getUserFields(topic.uid, ['username', 'userslug', 'picture'] , function(err, userData) {
				if (err) {
					return callback(err);
				}

				if (!userData) {
					userData = {};
				}

				topic.user = {
					username: userData.username || 'Anonymous',
					userslug: userData.userslug || '',
					picture: userData.picture || gravatar.url('', {}, true)
				};

				callback(null, topic);
			});
		});
	};

	Topics.getTopicPosts = function(tid, start, end, uid, reverse, callback) {
		posts.getPostsByTid(tid, start, end, reverse, function(err, postData) {
			if(err) {
				return callback(err);
			}

			if (Array.isArray(postData) && !postData.length) {
				return callback(null, []);
			}

			for(var i=0; i<postData.length; ++i) {
				postData[i].index = start + i;
			}

			var pids = postData.map(function(post) {
				return post.pid;
			});

			async.parallel({
				favourites : function(next) {
					favourites.getFavouritesByPostIDs(pids, uid, next);
				},
				voteData : function(next) {
					favourites.getVoteStatusByPostIDs(pids, uid, next);
				},
				userData : function(next) {
					async.each(postData, posts.addUserInfoToPost, next);
				},
				privileges : function(next) {
					async.map(pids, function (pid, next) {
						postTools.privileges(pid, uid, next);
					}, next);
				}
			}, function(err, results) {
				if(err) {
					return callback(err);
				}

				for (var i = 0; i < postData.length; ++i) {
					postData[i].favourited = results.favourites[i];
					postData[i].upvoted = results.voteData[i].upvoted;
					postData[i].downvoted = results.voteData[i].downvoted;
					postData[i].votes = postData[i].votes || 0;
					postData[i].display_moderator_tools = parseInt(uid, 10) !== 0 && results.privileges[i].editable;
					postData[i].display_move_tools = results.privileges[i].move;

					if(parseInt(postData[i].deleted, 10) === 1 && !results.privileges[i].view_deleted) {
						postData[i].content = 'This post is deleted!';
					}
				}

				callback(null, postData);
			});
		});
	};

	Topics.getPageCount = function(tid, uid, callback) {
		db.sortedSetCard('tid:' + tid + ':posts', function(err, postCount) {
			if(err) {
				return callback(err);
			}
			if(!parseInt(postCount, 10)) {
				return callback(null, 1);
			}
			user.getSettings(uid, function(err, settings) {
				if(err) {
					return callback(err);
				}

				callback(null, Math.ceil(parseInt(postCount, 10) / settings.postsPerPage));
			});
		});
	};

	Topics.getTidPage = function(tid, uid, callback) {
		if(!tid) {
			return callback(new Error('invalid-tid'));
		}

		async.parallel({
			index: function(next) {
				categories.getTopicIndex(tid, next);
			},
			settings: function(next) {
				user.getSettings(uid, next);
			}
		}, function(err, results) {
			if(err) {
				return callback(err);
			}
			callback(null, Math.ceil((results.index + 1) / results.settings.topicsPerPage));
		});
	};

	Topics.getCategoryData = function(tid, callback) {
		Topics.getTopicField(tid, 'cid', function(err, cid) {
			if(err) {
				callback(err);
			}

			categories.getCategoryData(cid, callback);
		});
	};

	function getTopics(set, uid, tids, callback) {
		var returnTopics = {
			topics: [],
			nextStart: 0
		};

		if (!tids || !tids.length) {
			return callback(null, returnTopics);
		}

		async.filter(tids, function(tid, next) {
			threadTools.privileges(tid, uid, function(err, privileges) {
				next(!err && privileges.read);
			});
		}, function(tids) {
			Topics.getTopicsByTids(tids, uid, function(err, topicData) {
				if(err) {
					return callback(err);
				}

				if(!topicData || !topicData.length) {
					return callback(null, returnTopics);
				}

				db.sortedSetRevRank(set, topicData[topicData.length - 1].tid, function(err, rank) {
					if(err) {
						return callback(err);
					}

					returnTopics.nextStart = parseInt(rank, 10) + 1;
					returnTopics.topics = topicData;
					callback(null, returnTopics);
				});
			});
		});
	}

	Topics.getLatestTids = function(start, end, term, callback) {
		var terms = {
			day: 86400000,
			week: 604800000,
			month: 2592000000
		};

		var since = terms.day;
		if(terms[term]) {
			since = terms[term];
		}

		var count = parseInt(end, 10) === -1 ? end : end - start + 1;

		db.getSortedSetRevRangeByScore(['topics:recent', '+inf', Date.now() - since, 'LIMIT', start, count], callback);
	};

	Topics.getLatestTopics = function(uid, start, end, term, callback) {
		Topics.getLatestTids(start, end, term, function(err, tids) {
			if(err) {
				return callback(err);
			}
			getTopics('topics:recent', uid, tids, callback);
		});
	};

	Topics.getTopicsFromSet = function(uid, set, start, end, callback) {
		db.getSortedSetRevRange(set, start, end, function(err, tids) {
			if(err) {
				return callback(err);
			}

			getTopics(set, uid, tids, callback);
		});
	};

	Topics.getTopicsByTids = function(tids, uid, callback) {
		if (!Array.isArray(tids) || tids.length === 0) {
			return callback(null, []);
		}

		var categoryCache = {},
			privilegeCache = {},
			userCache = {};


		function loadTopicInfo(topicData, next) {
			if (!topicData) {
				return next(null, null);
			}

			function isTopicVisible(topicData, topicInfo) {
				var deleted = parseInt(topicData.deleted, 10) !== 0;
				return !deleted || (deleted && topicInfo.privileges.view_deleted) || parseInt(topicData.uid, 10) === parseInt(uid, 10);
			}

			async.parallel({
				hasread: function(next) {
					Topics.hasReadTopic(topicData.tid, uid, next);
				},
				teaser: function(next) {
					Topics.getTeaser(topicData.tid, next);
				},
				privileges: function(next) {
					if (privilegeCache[topicData.cid]) {
						return next(null, privilegeCache[topicData.cid]);
					}
					categoryTools.privileges(topicData.cid, uid, next);
				},
				categoryData: function(next) {
					if (categoryCache[topicData.cid]) {
						return next(null, categoryCache[topicData.cid]);
					}
					categories.getCategoryFields(topicData.cid, ['name', 'slug', 'icon', 'bgColor', 'color'], next);
				},
				user: function(next) {
					if (userCache[topicData.uid]) {
						return next(null, userCache[topicData.uid]);
					}
					user.getUserFields(topicData.uid, ['username', 'userslug', 'picture'], next);
				}
			}, function(err, topicInfo) {
				if(err) {
					return next(err);
				}

				privilegeCache[topicData.cid] = topicInfo.privileges;
				categoryCache[topicData.cid] = topicInfo.categoryData;
				userCache[topicData.uid] = topicInfo.user;

				if (!topicInfo.teaser) {
					return next(null, null);
				}

				if (!isTopicVisible(topicData, topicInfo)) {
					return next(null, null);
				}

				topicData.pinned = parseInt(topicData.pinned, 10) === 1;
				topicData.locked = parseInt(topicData.locked, 10) === 1;
				topicData.deleted = parseInt(topicData.deleted, 10) === 1;
				topicData.unread = !(topicInfo.hasread && parseInt(uid, 10) !== 0);
				topicData.unreplied = parseInt(topicData.postcount, 10) === 1;

				topicData.category = topicInfo.categoryData;
				topicData.teaser = topicInfo.teaser;
				topicData.user = topicInfo.user;

				next(null, topicData);
			});
		}

		Topics.getTopicsData(tids, function(err, topics) {
			if (err) {
				return callback(err);
			}

			async.mapSeries(topics, loadTopicInfo, function(err, topics) {
				if(err) {
					return callback(err);
				}

				topics = topics.filter(function(topic) {
					return !!topic;
				});

				callback(null, topics);
			});
		});
	};

	Topics.getTopicWithPosts = function(tid, uid, start, end, callback) {
		threadTools.exists(tid, function(err, exists) {
			if (err || !exists) {
				return callback(err || new Error('Topic tid \'' + tid + '\' not found'));
			}

			async.parallel({
				topicData : function(next) {
					Topics.getTopicData(tid, next);
				},
				posts : function(next) {
					Topics.getTopicPosts(tid, start, end, uid, false, next);
				},
				privileges : function(next) {
					threadTools.privileges(tid, uid, next);
				},
				category : function(next) {
					Topics.getCategoryData(tid, next);
				},
				pageCount : function(next) {
					Topics.getPageCount(tid, uid, next);
				},
				threadTools : function(next) {
					Plugins.fireHook('filter:topic.thread_tools', [], next);
				}
			}, function(err, results) {
				if (err) {
					winston.error('[Topics.getTopicWithPosts] Could not retrieve topic data: ', err.message);
					return callback(err);
				}

				var topicData = results.topicData;
				topicData.category = results.category;
				topicData.posts = results.posts;
				topicData.thread_tools = results.threadTools;
				topicData.pageCount = results.pageCount;
				topicData.unreplied = parseInt(topicData.postcount, 10) === 1;
				topicData.expose_tools = results.privileges.editable ? 1 : 0;

				callback(null, topicData);
			});
		});
	};

	Topics.getAllTopics = function(start, end, callback) {
		db.getSortedSetRevRange('topics:tid', start, end, function(err, tids) {
			if(err) {
				return callback(err);
			}

			async.map(tids, function(tid, next) {
				Topics.getTopicDataWithUser(tid, next);
			}, callback);
		});
	};

	Topics.getTitleByPid = function(pid, callback) {
		Topics.getTopicFieldByPid('title', pid, callback);
	};

	Topics.getTopicFieldByPid = function(field, pid, callback) {
		posts.getPostField(pid, 'tid', function(err, tid) {
			Topics.getTopicField(tid, field, callback);
		});
	};

	Topics.getTopicDataByPid = function(pid, callback) {
		posts.getPostField(pid, 'tid', function(err, tid) {
			Topics.getTopicData(tid, callback);
		});
	};


	Topics.getTeasers = function(tids, callback) {

		if(!Array.isArray(tids)) {
			return callback(null, []);
		}

		async.map(tids, Topics.getTeaser, callback);
	};

	Topics.getTeaser = function(tid, callback) {
		threadTools.getLatestUndeletedPid(tid, function(err, pid) {
			if (err) {
				return callback(err);
			}

			if (!pid) {
				return callback(null, null);
			}

			posts.getPostFields(pid, ['pid', 'uid', 'timestamp'], function(err, postData) {
				if (err) {
					return callback(err);
				} else if(!postData) {
					return callback(new Error('no-teaser-found'));
				}

				user.getUserFields(postData.uid, ['username', 'userslug', 'picture'], function(err, userData) {
					if (err) {
						return callback(err);
					}

					callback(null, {
						pid: postData.pid,
						username: userData.username || 'anonymous',
						userslug: userData.userslug || '',
						picture: userData.picture || gravatar.url('', {}, true),
						timestamp: utils.toISOString(postData.timestamp)
					});
				});
			});
		});
	};

	Topics.getTopicField = function(tid, field, callback) {
		db.getObjectField('topic:' + tid, field, callback);
	};

	Topics.getTopicFields = function(tid, fields, callback) {
		db.getObjectFields('topic:' + tid, fields, callback);
	};

	Topics.setTopicField = function(tid, field, value, callback) {
		db.setObjectField('topic:' + tid, field, value, callback);
	};

	Topics.increasePostCount = function(tid, callback) {
		incrementFieldAndUpdateSortedSet(tid, 'postcount', 1, 'topics:posts', callback);
	};

	Topics.decreasePostCount = function(tid, callback) {
		incrementFieldAndUpdateSortedSet(tid, 'postcount', -1, 'topics:posts', callback);
	};

	Topics.increaseViewCount = function(tid, callback) {
		incrementFieldAndUpdateSortedSet(tid, 'viewcount', 1, 'topics:views', callback);
	};

	function incrementFieldAndUpdateSortedSet(tid, field, by, set, callback) {
		db.incrObjectFieldBy('topic:' + tid, field, by, function(err, value) {
			if(err) {
				return callback(err);
			}
			db.sortedSetAdd(set, value, tid, callback);
		});
	}

	Topics.isLocked = function(tid, callback) {
		Topics.getTopicField(tid, 'locked', function(err, locked) {
			if(err) {
				return callback(err);
			}
			callback(null, parseInt(locked, 10) === 1);
		});
	};

	Topics.updateTimestamp = function(tid, timestamp) {
		db.sortedSetAdd('topics:recent', timestamp, tid);
		Topics.setTopicField(tid, 'lastposttime', timestamp);
	};

	Topics.onNewPostMade = function(postData) {
		Topics.increasePostCount(postData.tid);
		Topics.updateTimestamp(postData.tid, postData.timestamp);
		Topics.addPostToTopic(postData.tid, postData.pid, postData.timestamp);
	};

	emitter.on('event:newpost', Topics.onNewPostMade);

	Topics.addPostToTopic = function(tid, pid, timestamp, callback) {
		db.sortedSetAdd('tid:' + tid + ':posts', timestamp, pid, callback);
	};

	Topics.removePostFromTopic = function(tid, pid, callback) {
		db.sortedSetRemove('tid:' + tid + ':posts', pid, callback);
	};

	Topics.getPids = function(tid, callback) {
		db.getSortedSetRange('tid:' + tid + ':posts', 0, -1, callback);
	};

	Topics.getUids = function(tid, callback) {
		var uids = {};
		Topics.getPids(tid, function(err, pids) {

			function getUid(pid, next) {
				posts.getPostField(pid, 'uid', function(err, uid) {
					if (err) {
						return next(err);
					}
					uids[uid] = 1;
					next();
				});
			}

			async.each(pids, getUid, function(err) {
				if (err) {
					return callback(err);
				}

				callback(null, Object.keys(uids));
			});
		});
	};

	Topics.updateTopicCount = function(callback) {
		db.sortedSetCard('topics:recent', function(err, count) {
			if(err) {
				return callback(err);
			}

			db.setObjectField('global', 'topicCount', count, callback);
		});
	};

	Topics.delete = function(tid, callback) {
		async.parallel([
			function(next) {
				Topics.setTopicField(tid, 'deleted', 1, next);
			},
			function(next) {
				db.sortedSetRemove('topics:recent', tid, next);
			},
			function(next) {
				db.sortedSetRemove('topics:posts', tid, next);
			},
			function(next) {
				db.sortedSetRemove('topics:views', tid, next);
			},
			function(next) {
				Topics.getTopicField(tid, 'cid', function(err, cid) {
					if(err) {
						return next(err);
					}
					db.incrObjectFieldBy('category:' + cid, 'topic_count', -1, next);
				});
			}
		], function(err) {
			if (err) {
				return callback(err);
			}

			Topics.updateTopicCount(callback);
		});
	};

	Topics.restore = function(tid, callback) {
		Topics.getTopicFields(tid, ['lastposttime', 'postcount', 'viewcount'], function(err, topicData) {
			if(err) {
				return callback(err);
			}

			async.parallel([
				function(next) {
					Topics.setTopicField(tid, 'deleted', 0, next);
				},
				function(next) {
					db.sortedSetAdd('topics:recent', topicData.lastposttime, tid, next);
				},
				function(next) {
					db.sortedSetAdd('topics:posts', topicData.postcount, tid, next);
				},
				function(next) {
					db.sortedSetAdd('topics:views', topicData.viewcount, tid, next);
				},
				function(next) {
					Topics.getTopicField(tid, 'cid', function(err, cid) {
						if(err) {
							return next(err);
						}
						db.incrObjectFieldBy('category:' + cid, 'topic_count', 1, next);
					});
				}
			], function(err) {
				if (err) {
					return callback(err);
				}

				Topics.updateTopicCount(callback);
			});
		});
	};
}(exports));