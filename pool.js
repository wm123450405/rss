const { sleep, parallel } = require("asyncbox");
const os = require('os');

const destroyWait = 300;

const calcMax = (count, max, usage) => {
    return Math.min(max, count + Math.floor(Math.max(usage, os.freemem() - 512*1024*1024) / usage) - 1);
}

class Pool {
    constructor(creation, freeing, destroy, idle, max, usage) {
        this.creation = creation;
        this.freeing = freeing;
        this.destroy = destroy;
        this.idle = idle;
        this.max = max;
        this.usage = usage;
        this.pool = [];
        this.used = [];
        this.count = 0;
        this.finalized = false;
        this.check();
    }
    async check() {
        if (!this.finalized) {
            if ((this.count - this.used.length) < this.idle && this.count < calcMax(this.count, this.max, this.usage)) {
                this.count++;
                try {
                    this.pool.push(await this.creation());
                } catch(e) {
                    this.count--;
                }
            } else if ((this.count - this.used.length) > this.idle) {
                for(let i = 0; i < destroyWait && !this.finalized; i++) {
                    await sleep(1000);
                }
                if (!this.finalized && (this.count - this.used.length) > this.idle) {
                    try {
                        let obj = this.pool.shift();
                        this.count--;
                        await this.destroy(obj);
                    } catch(e) {
                        this.pool.push(obj);
                        this.count++;
                    };
                }
            }
            if (!this.finalized) {
                if ((this.count - this.used.length) < this.idle && this.count < calcMax(this.count, this.max, this.usage)) {
                    this.check();
                } else if ((this.count - this.used.length) > this.idle) {
                    this.check();
                }
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
        try {
            let index = this.used.indexOf(obj);
            if (index !== -1) {
                this.used.splice(index, 1);
            }
            await this.freeing(obj);
            this.pool.push(obj);
        } catch(e) {
            try {
                this.count--;
                await this.destroy(obj);
            } catch(e) {
                this.pool.push(obj);
                this.count++;
            }
        } finally {
            this.check();
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
    async destoryAll() {
        await parallel(this.pool.map(obj => (async () => {
            try {
                let index = this.pool.indexOf(obj);
                if (index !== -1) {
                    this.pool.splice(index, 1);
                    this.count--;
                    await this.destroy(obj);
                }
            } catch(e) {}
        })()));
    }
    async finalize(callback) {
        this.finalized = true;
        await this.freeAll(callback);
        await this.destoryAll();
    }
}

module.exports = Pool;