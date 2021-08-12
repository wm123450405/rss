const { sleep, parallel } = require("asyncbox");
class Pool {
    constructor(creation, destroy, idle = 5, max = 20) {
        this.creation = creation;
        this.destroy = destroy;
        this.idle = idle;
        this.max = max;
        this.pool = [];
        this.used = [];
        this.count = 0;
        this.finalized = false;
        this.check();
    }
    async check() {
        if (!this.finalized) {
            if (this.pool.length < this.idle && this.count < this.max) {
                this.pool.push(await this.creation());
                this.count++;
            }
            if (this.pool.length < this.idle && this.count < this.max) {
                this.check();
            }
        }
    }
    async get() {
        try {
            while (!this.pool.length) {
                await sleep(10);
            }
            let value = this.pool.shift();
            this.used.push(value);
            return value;
        } finally {
            this.check();
        }
    }
    async free(obj) {
        this.pool.push(obj);
        let index = this.used.indexOf(obj);
        if (index !== -1) {
            this.used.splice(index, 1);
        }
        if (this.pool.length > this.idle) {
            await this.destroy(this.pool.shift());
            this.count--;
        }
    }
    get values() {
        return [...this.pool];
    }
    async freeAll(callback) {
        await parallel(this.used.map(obj => (async () => {
            try {
                if (callback) {
                    await callback(obj);
                }
                await this.free(obj);
            } catch(e) {}
        })()));
    }
    async finalize(callback) {
        this.finalized = true;
        await this.freeAll(callback);
    }
}

module.exports = Pool;