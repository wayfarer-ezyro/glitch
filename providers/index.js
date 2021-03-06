const _ = require("lodash");
const Paginator = require("../models/paginator");
const { keyboard } = require("../utils/bot-helper");
const errorHandler = require("../utils/error-handler");

module.exports = class Provider {
	/**
	 * Constructor
	 * @param  {} bot
	 */
	constructor(bot) {
		this.bot = bot;
	}

	/**
	 * Search items
	 * @param  {} message
	 * @param  {} params
	 */
	search(message, params) {}

	/**
	 * List items
	 * @param  {} message
	 */
	list(message) {}

	/**
	 * Handle pagination
	 * @param  {} message
	 * @param  {} data
	 * @param  {} method
	 */
	async paginate(message, data, method = "list") {
		const chatId = message.chat.id;
		const results = await Paginator.find({
			user: chatId,
			type: this.type,
			createdAt: { $gt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
		});

		if (results.length > 0) {
			const IDs = [];
			_.map(results, async result => {
				IDs.push(result._id);
				this.bot.deleteMessage(chatId, result._id);
			});
			await Paginator.deleteMany({ _id: { $in: IDs } });
		}

		await this[method](message, data);
	}

	/**
	 * Task resolver
	 * @param  {} data
	 * @param  {} message
	 */
	async resolve(data, message) {
		try {
			switch (data.type) {
				case `list_${this.type}`:
					await this.list(message);
					break;
				case `paginate_list_${this.type}`:
					await this.paginate(message, data.page, "list");
					break;
				case `search_${this.type}`:
					await this.interactiveSearch(message);
					break;
			}
		} catch (error) {
			errorHandler(this.bot, message.chat.id, error);
		}
	}

	/**
	 * @param  {} chat_id
	 * @param  {} message_id
	 * @param  {} message
	 */
	emptyAPIResponse(
		chat_id,
		message_id,
		message = "The list is empty or limit reached."
	) {
		this.bot.deleteMessage(chat_id, message_id);
		this.bot.sendMessage(chat_id, "\u{26A0} " + message, keyboard);
	}
};
