const { sleep } = require("asyncbox");

class Pool {
    constructor(creation, destory, idle = 5, max = 20) {
        this.creation = creation;
        this.destory = destory;
        this.idle = idle;
        this.max = max;
        this.pool = [];
        this.count = 0;
        this.check();
    }
    async check() {
        if (this.pool.length < this.idle && this.count < this.max) {
            this.pool.push(await this.creation());
            this.count++;
        }
        if (this.pool.length < this.idle && this.count < this.max) {
            this.check();
        }
    }
    async get() {
        try {
            while (!this.pool.length) {
                await sleep(10);
            }
            return this.pool.shift();
        } finally {
            this.check();
        }
    }
    async free(obj) {
        this.pool.push(obj);
        if (this.pool.length > this.idle) {
            await this.destory(this.pool.shift());
            this.count--;
        }
    }
    get values() {
        return [...this.pool];
    }
}

module.exports = Pool;