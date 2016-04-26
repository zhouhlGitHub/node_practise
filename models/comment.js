var mongodb = require('./db');
function Comment(userName, day, title, comment) {
    this.userName = userName;
    this.day = day;
    this.title = title;
    this.comment = comment;
}
module.exports = Comment;

Comment.prototype.save = function (callback) {
    var userName = this.userName,
        day = this.day,
        title = this.title,
        comment = this.comment;

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
                "userName": userName,
                "time.day": day,
                "title": title
            }, {
                $push: {"comments": comment}
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
