class ExampleSystem {
    constructor() {
        // Empty constructor
    }

    static async create(config) {
        const instance = new ExampleSystem();
        const result = await instance.createInstance(config);
        return result;
    }

    async createInstance(config) {
        // Empty, ready for people to edit
        return {};
    }
}

module.exports = ExampleSystem;