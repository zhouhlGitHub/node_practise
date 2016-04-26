var express = require('express');
var router = express.Router();
var crypto = require('crypto'),
    User = require('../models/user.js'),
    Article = require('../models/article.js'),
    Comment = require('../models/comment.js'),
    formidable = require('formidable'),
    fs = require('fs');

/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

function checkLogin(req, res, next) {
    if (!req.session.user) {
        req.flash('error', '未登陆！');
        res.redirect('/login');
    }
    next();
}
function checkNotLogin(req, res, next) {
    if (req.session.user) {
        req.flash('error', '已登录！');
        res.redirect('back');
    }
    next();
}

module.exports = function(app) {
    app.get('/', checkLogin);
    app.get('/', function (req, res) {
        var page = req.query.p ? parseInt(req.query.p) : 1;
        Article.getTen(null, page, function (err, articles, total) {
            if (err) {
                articles = [];
            }
            res.render('index', {
                title: "主页",
                user: req.session.user,
                articles: articles,
                page: page,
                isFirstPage: (page - 1) == 0,
                isLastPage: ((page - 1) * 10 + articles.length) == total,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });

    });
    app.get('/reg', checkNotLogin);
    app.get('/reg', function (req, res) {
        res.render('reg', {
            title: "注册",
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    app.post('/reg', checkNotLogin);
    app.post('/reg', function (req, res) {
        console.log("reg post request!");
        var name = req.body.name,
            password = req.body.password,
            password_re = req.body['password-confirm'],
            email = req.body.email;
        if (password != password_re) {
            req.flash('error', '两次输入的密码不一致！');
            return res.redirect('/reg');
        }
        var md5 = crypto.createHash('md5'),
            password = md5.update(password).digest('hex');

            console.log("password:" + password);
            console.log("user name:" + name);
        var newUser = new User({
            name: name,
            password: password,
            email: email
        });
        User.get(newUser.name, function(err, user) {
            if (user) {
                req.flash('error', '用户已存在！');
                return res.redirect('/reg');
            }
            newUser.save(function(err, user) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/reg');
                }
                req.session.user = user;
                req.flash('success', '注册成功！');
                res.redirect('/');
            });
        });
    });
    app.get('/login', checkNotLogin);
    app.get('/login', function (req, res) {
        res.render('login', {
            title: "登录" ,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    app.post('login', checkNotLogin);
    app.post('/login', function (req, res) {
        var name = req.body.name,
            password = req.body.password,
            md5 = crypto.createHash('md5'),
            password = md5.update(password).digest('hex');
        User.get(name, function(err, user) {
            if (!user) {
                req.flash('error', '用户不存在！');
                return res.redirect('/login');
            }
            if (user.password != password) {
                req.flash('error', '密码错误！');
                return res.redirect('/login');
            }
            req.session.user = user;
            req.flash('success', '登陆成功！');
            res.redirect('/');
        })
    });
    app.get('/publish', checkLogin);
    app.get('/publish', function (req, res) {
        res.render('publish', {
            title: "发表" ,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    app.post('/publish', checkLogin);
    app.post('/publish', function (req, res) {
        var currentUser = req.session.user,
            tags = [req.body.tag1, req.body.tag2, req.body.tag3],
            article = new Article({
                userName: currentUser.name,
                head: currentUser.head,
                title: req.body.title,
                tags: tags,
                content: req.body.content
            });
        article.save(function(err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            req.flash('success', '发布成功！');
            res.redirect('/');
        })
    });
    app.get('/logout', checkLogin);
    app.get('/logout', function (req, res) {
        req.session.user = null;
        req.flash("success", '登出成功！');
        res.redirect('/login');
    });
    app.get('/upload', checkLogin);
    app.get('/upload', function (req, res) {
        res.render('upload', {
            title: '文件上传',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    app.post('/upload', checkLogin);
    app.post('/upload', function (req, res) {
        console.log("upload file...");
        //console.dir(req);
        var form = new formidable.IncomingForm(),
            files = [],
            fields = [];
        //console.dir(form);
        form.uploadDir = 'public/images/';
        // form.on('field', function (field, value) {
        //     console.log(field, value);
        //     fields.push([field, value]);
        // })
        form.on('file', function (field, file) {
            console.log(field, file);
            console.dir(file);
            if (file.size ==0) {
                fs.unlinkSync(file.path);
                console.log('Successfully removed an empty file!');
            } else {
                var  target_path = './public/images/' + file.name;
                fs.renameSync(file.path, target_path);
                console.log('Successfully renamed a file!');
            }
        });
        // .on('end', function (name, file) {
        //
        //     req.flash('success', '文件上传成功！');
        //     res.redirect('/upload');
        // });
        form.parse(req, function (err, fields, files) {
            // res.writeHead(200, {'content-type': 'text/plain'});
            // res.write('received upload:\n\n');
            // res.end(util.inspect({fields: fields, files: files}));

            req.flash('success', '文件上传成功！');
            res.redirect('/upload');
        });
    });
    app.get('/u/:name', function (req, res) {
        var page = req.query.p ? parseInt(req.query.p) : 1;
        User.get(req.params.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户不存在！');
                return res.redirect('/');
            }
            Article.getTen(user.name, page, function (err, articles, total) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/');
                }
                res.render('user', {
                    title: user.name,
                    articles: articles,
                    page: page,
                    isFirstPage: (page - 1) == 0,
                    isLastPage: ((page - 1) * 10 + articles.length) == total,
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            });
        });
    });
    app.get('/u/:name/:day/:title', checkLogin);
    app.get('/u/:name/:day/:title', function (req, res) {
        //console.log(req.params.name, req.params.day, req.params.title);
        console.dir(Article);
        Article.getOne(req.params.name, req.params.day, req.params.title, function (err, article) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('article', {
                title: req.params.title,
                article: article,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.post('/u/:name/:day/:title', checkLogin);
    app.post('/u/:name/:day/:title', function (req, res) {
        var date = new Date(),
            time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes():date.getMinutes());
        var md5 = crypto.createHash('md5'),
            email_MD5 = md5.update(this.email.toLowerCase()).digest('hex'),
            head = 'http://www.gravatar.com/avatar/' + email_MD5 + '?s=48';
        var comment = {
            userName: req.body.name,
            head: head,
            email: req.body.email,
            website: req.body.website,
            time: time,
            content: req.body.content
        };
        var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
        newComment.save(function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '留言成功！');
            res.redirect('back');
        })
    });
    app.get('/edit/:name/:day/:title', checkLogin);
    app.get('/edit/:name/:day/:title', function (req, res) {
        var currentUser = req.session.user;
        Article.edit(currentUser.name, req.params.day, req.params.title, function (err, article) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            res.render('edit', {
                title: "编辑",
                article: article,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.post('/edit/:name/:day/:title', checkLogin);
    app.post('/edit/:name/:day/:title', function (req, res) {
        var currentUser = req.session.user;
        Article.update(currentUser.name, req.params.day, req.params.title, req.body.content, function (err) {
            var url = '/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title;
            if (err) {
                req.flash('error', err);
                return res.redirect(url);
            }
            req.flash('success', '修改成功！');
            res.redirect(url);
        });
    });
    app.get('/remove/:name/:day/:title', checkLogin);
    app.get('/remove/:name/:day/:title', function (req, res) {
        console.log("remove start!");
        var currentUser = req.session.user;
        Article.remove(currentUser.name, req.params.day, req.params.title, function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '删除成功！');
            res.redirect('/');
        });
    });
    app.get('/reprint/:name/:day/:title', checkLogin);
    app.get('/reprint/:name/:day/:title', function (req, res) {
        Article.edit(req.params.name, req.params.day, req.params.title, function (err, article) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            var currentUser = req.session.user,
                reprint_from = {
                    userName: article.userName,
                    day: article.time.day,
                    title: article.title
                },
                reprint_to = {
                    userName: currentUser.name,
                    head: currentUser.head,
                };
            Article.reprint(reprint_from, reprint_to, function (err, article) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('back');
                }
                req.flash('success', '转载成功！');
                var url = '/u/' + article.userName + '/' + article.time.day + '/' + article.title;
                res.redirect(url);
            });
        });
    });
    //app.get('/archive', checkLogin);
    app.get('/archive', function (req, res) {
        Article.getArchive(function (err, articles) {
            if (err) {
                req.flash('error', err);
                res.redirect('/');
            }
            res.render('archive', {
                title: '存档',
                articles : articles,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/tags', function (req, res) {
        Article.getTags(function (err, tags) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('tags', {
                title: "标签",
                tags: tags,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/tags/:tag', function (req, res) {
        Article.getTag(req.params.tag, function (err, tags) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('tag', {
                title: 'TAG:' + req.params.tag,
                tags: tags,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/links', function (req, res) {
        res.render('links', {
            title: "友情链接",
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    app.get('/search', function (req, res) {
        Article.search(req.query.keyword, function (err, articles) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('search', {
                title: "SEARCH:" + req.query.keyword,
                articles: articles,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
};
