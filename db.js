const path = require('path');
const config = require('./config');
const Database = require('tingodb')({}).Db;

class Db {
    init(app, space, indexes) {
        return new Promise((resolve, reject) => {
            new Database(path.join(app.getPath('userData'), config.path.dir), {}).open((err, db) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    let collection = db.collection(space + '.db');
                    let i = 0;
                    if (i >= indexes.length) {
                        this.db = collection;
                        resolve(this);
                    } else {
                        const createIndex = () => {
                            let index = indexes[i];
                            let options = { };
                            if (!(index instanceof String) && typeof index !== 'string' && !(index instanceof Array)) {
                                options = index.options;
                                index = [index.key, typeof index.sort === 'undefined' ? 1 : index.sort];
                            }
                            collection.createIndex(index, options, err => {
                                if (err) {
                                    console.error(err);
                                    reject(err);
                                } else {
                                    i++;
                                    if (i >= indexes.length) {
                                        this.db = collection;
                                        resolve(this);
                                    } else {
                                        createIndex();
                                    }
                                }
                            })
                        }
                        createIndex();
                    }
                }
            });
        })
    }
    static async create(app, space, indexes) {
        let db = new Db()
        await db.init(app, space, indexes || []);
        return db;
    }
    findOne(query, sortQuery) {
        return new Promise((resolve, reject) => {
            this.db.findOne(query, { sort: sortQuery }, (err, doc) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(doc);
                }
            });
        });
    }
    find(query, sortQuery) {
        return new Promise((resolve, reject) => {
            this.db.find(query, { sort: sortQuery }).toArray((err, docs) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(docs);
                }
            })
        });
    }
    insert(doc) {
        return new Promise((resolve, reject) => {
            this.db.insert(doc, {}, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(doc);
                }
            })
        });
    }
    remove(query) {
        return new Promise((resolve, reject) => {
            this.db.remove(query, {}, function(err, docs) {
                if (err) {
                    reject(err);
                } else {
                    resolve(docs);
                }
            });
        });
    }
}

module.exports = Db;
