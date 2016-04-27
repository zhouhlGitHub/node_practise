var mongodb = require('./db'),
    markdown = require('markdown').markdown;

function Article(article) {
    this.userName = article.userName;
    this.head = article.head;
    this.title = article.title;
    this.tags = article.tags;
    this.content = article.content;
};

module.exports = Article;

Article.prototype.save = function (callback) {
    var date = new Date(),
        time = {
            date: date,
            year: date.getFullYear(),
            month: date.getFullYear() + "-" + (date.getMonth() + 1),
            day: date.getFullYear() + "-" + (date.getMonth() + 1) + '-' + date.getDate(),
            minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes())
        }
    var article = {
        userName : this.userName,
        head: this.head,
        time: time,
        title : this.title,
        tags: this.tags,
        content : this.content,
        comments : [],
        reprint_info: {},
        pv: 0
    };
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('articles', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.insert(article, {
                safe: true
            },function (err, article) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });

};
Article.getTen = function (userName, page, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('articles', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var query = {};
            if (userName) {
                query.userName = userName;
            }
            collection.count(query, function (err, total) {
                collection.find(query, {
                    skip: (page - 1) * 10,
                    limit: 10
                }).sort({
                    time: -1
                }).toArray(function (err, article) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }
                    // article.forEach(function (doc) {
                    //     doc.content = markdown.toHTML(doc.content);
                    // });
                    callback(null, article, total);
                });
            });
        });
    });
};

Article.getOne = function (name, day, title, callback) {
    console.log(name,day,title);
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        console.dir(db);
        db.collection('articles', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                "userName": name,
                "title": title,
                "time.day": day
            }, function (err, doc) {

                if (err) {
                    mongodb.close();
                    return callback(err);
                }
                if (doc) {
                    collection.update({
                        "userName": name,
                        "time.day": day,
                        "title": title
                    }, {
                        $inc: {"pv": 1}
                    }, function (err) {
                        mongodb.close();
                        if (err) {
                            return callback(err);
                        }
                    });
                    // doc.content = markdown.toHTML(doc.content);
                    // if (doc.comments) {
                    //     doc.comments.forEach(function (comment) {
                    //         comment.content = markdown.toHTML(comment.content);
                    //     });
                    // }
                    callback(null, doc);
                }
            });
        });
    });
};
Article.edit = function (name, day, title, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('articles', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                "userName": name,
                "time.day": day,
                "title": title
            }, function (err, doc) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, doc);
            });
        });
    });
};
Article.update = function (name, day, title, content, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('articles', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.update({
                "userName": name,
                "time.day": day,
                "title": title
            }, {
                $set: {content: content}
            }, function (err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};
Article.remove = function (name, day, title, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('articles', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                "userName": name,
                "time.day": day,
                "title": title
            }, function (err, doc) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }
                var reprint_from = "";
                if (doc.reprint_info.reprint_from) {
                    reprint_from = doc.reprint_info.reprint_from;
                }
                if (reprint_from) {
                    collection.update({
                        "userName": reprint_from.userName,
                        "time.day": reprint_from.day,
                        "title": reprint_from.title
                    }, {
                        $pull: {
                            "reprint_info.reprint_to": {
                                "userName": name,
                                "day": day,
                                "title": title
                            }
                        }
                    }, function (err) {
                        if (err) {
                            mongodb.close();
                            return callback(err);
                        }
                    });
                }
                collection.remove({
                    "userName": name,
                    "time.day": day,
                    "title": title
                }, {
                    w: 1
                }, function (err) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            });
        });
    });
};
Article.getArchive = function (callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('articles', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.find({}, {
                "userName": 1,
                "time": 1,
                "title": 1
            }).sort({
                time: -1
            }).toArray(function (err, article) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, article);
            });
        });
    });
};
Article.getTags = function (callback) {
    mongodb.open( function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('articles', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //distinct用来查找给定健的所有不同值
            collection.distinct('tags', function (err, tags) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, tags);
            });
        });
    });
};
Article.getTag = function (tag, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('articles', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.find({
                "tags": tag
            }, {
                "userName" : 1,
                "time": 1,
                "title": 1
            }).sort({
                time: -1
            }).toArray(function (err, tags) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, tags);
            });
        });
    });
};
Article.search = function (keyword, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('articles', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var pattern = new RegExp("^.*" + keyword + ".*$", "i");
            collection.find({
                "title": pattern
            }, {
                "userName": 1,
                "time": 1,
                "title": 1
            }).sort({
                time: -1
            }).toArray(function (err, articles) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, articles);
            });
        });
    });
};
Article.reprint = function (reprint_from, reprint_to, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('articles', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                "userName": reprint_from.userName,
                "time.day": reprint_from.day,
                "title": reprint_from.title
            }, function (err, doc) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }
                var date = new Date(),
                    time = {
                        date: date,
                        year: date.getFullYear(),
                        month: date.getFullYear() + "-" + (date.getMonth() + 1),
                        day: date.getFullYear() + "-" + (date.getMonth() + 1) + '-' + date.getDate(),
                        minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes())
                    };
                delete doc._id;
                doc.userName = reprint_to.userName;
                doc.head = reprint_to.head;
                doc.time = time;
                doc.title = (doc.title.search(/[转载]/) > -1) ? doc.title : "[转载]" + doc.title;
                doc.comments = [];
                doc.reprint_info = {
                    "reprint_from": reprint_from
                };
                doc.pv = 0;
                collection.update({
                    "userName": reprint_from.userName,
                    "time.day": reprint_from.day,
                    "title": reprint_from.title
                }, {
                    $push: {
                        "reprint_info.reprint_to" :{
                            "userName": doc.userName,
                            "day": time.day,
                            "title": doc.title
                        }
                    }
                }, function (err) {
                    if (err) {
                        mongodb.close();
                        return callback(err);
                    }
                });
                collection.insert(doc, {
                    safe: true
                }, function (err, article) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }
                    callback(null, article[0]);
                });
            });
        });
    });
};
