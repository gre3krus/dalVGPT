import { Telegraf, session } from "telegraf";
import moment from "moment/moment.js";
import { message } from "telegraf/filters";
import { code } from "telegraf/format";
import config from "config";
import { ogg } from "./ogg.js";
import { openai } from "./openai.js";

console.log(config.get("TEST_ENV"));

const INITIAL_SESSION = {
  messages: [],
};

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"));

bot.use(session());

bot.command("new", async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply("Ок, сменим тему");
});

// bot.command("/menu", (ctx) => {
//   return ctx.reply("Выбери команду:", {
//     reply_markup: {
//       inline_keyboard: [
//         [
//           {
//             text: "Start",
//             callback_data: "/start",
//           },
//           {
//             text: "Help",
//             callback_data: "/help",
//           },
//         ],
//         [
//           {
//             text: "about",
//             callback_data: "/about",
//           },
//           {
//             text: "image",
//             callback_data: "/image",
//           },
//         ],
//       ],
//     },
//   });
// });

bot.command("start", async (ctx) => {
  try {
    const userId = String(ctx.message.from.username);
    ctx.session = INITIAL_SESSION;
    await ctx.reply(
      `Привет ${userId}, меня зовут Дэйлв!\nМеня создал Рыбасов Владислав и я помогу тебе решить твой вопрос!.\nВот мой список команд /help`
    );
  } catch (e) {
    console.log("Error from command start");
  }
});

bot.command("help", async (ctx) => {
  try {
    await ctx.reply("Вот мой список команд:");
    await ctx.reply(
      `/start - Начать общение \n/help - Список команд\n/about - Узнай обо мне!\n/image - В разработке...`
    );
  } catch (e) {
    console.log("Error from command help");
  }
});

bot.command("about", async (ctx) => {
  try {
    await ctx.reply(
      `Меня зовут Дэйлв! Не знаю, зачем меня так назвали, но так уж вышло \nМой мозг связан с серверами ChatGPT от OpenAI, поэтому я могу помочь тебе решить какие-либо вопросы! \nМоя главная особенность - распознавать ваши голосовые сообщения! \nБуду рад общению с тобой!`
    );
  } catch (e) {
    console.log("Error from command about");
  }
});

bot.command("image", async (ctx) => {
  try {
    await ctx.reply("В разработке...");
  } catch (e) {
    console.log("Error from image");
  }
});

// Отключение бота
// bot.drop(message("voice"), async (ctx) => {
//   try {
//     if (!voice) return;
//     await ctx.drop(1);
//     await ctx.reply(code("Доступ закрыт"));
//   } catch (e) {
//     console.log("Error from drop message voice");
//   }
// });

// Отключение бота
// bot.drop(message("text"), async (ctx) => {
//   try {
//     if (!text) return;
//     await ctx.reply(code("Доступ закрыт"));
//     await ctx.drop(1);
//   } catch (e) {
//     console.log("Error from drop message voice");
//   }
// });

const userMessageCounterMap = new Map();

bot.on(message("text"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    const userId = ctx.message.from.id.toString();
    const today = moment().format("L");

    // проверяем, есть ли запись о пользователе в userMessageCounterMap, если нет - создаем новую
    if (!userMessageCounterMap.has(userId)) {
      userMessageCounterMap.set(userId, { date: today, count: 1 });
    } else {
      const userCounter = userMessageCounterMap.get(userId);

      // если дата записи не равна сегодняшней дате, сбрасываем счетчик сообщений пользователя за день
      if (userCounter.date !== today) {
        userCounter.date = today;
        userCounter.count = 1;
      } else {
        // иначе увеличиваем счетчик на 1 и проверяем, не превысил ли пользователь лимит
        userCounter.count++;
        if (userCounter.count > 10) {
          await ctx.reply(`Ты превысил лимит 10 сообщений в день! ББ`);
          return;
        }
      }

      userMessageCounterMap.set(userId, userCounter);
    }

    // if (userId === "gr3ek") {
    //   messages.push(`gr3ek: ${message}`);
    // } else {
    //   messages.push(`${userId}: ${message}`);
    // }

    setInterval(() => {
      const today = moment().format("L");

      userMessageCounterMap.forEach((value) => {
        if (value.date !== today) {
          userMessageCounterMap.delete(value);
        }
      });
    }, 86400000);

    await ctx.reply(code("Ща ща"));
    const txt = ctx.message.text;
    await ctx.reply(code("Обрабатываю.."));

    ctx.session.messages.push({ role: openai.roles.USER, content: txt });

    const response = await openai.chat(ctx.session.messages);

    ctx.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response.content,
    });

    await ctx.reply(response.content);
  } catch (e) {
    console.log(`Error while text user message`, e.message);
  }
});

bot.on(message("voice"), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    const userId = ctx.message.from.first_name.toString();
    const today = moment().format("L");

    if (!userMessageCounterMap.has(userId)) {
      userMessageCounterMap.set(userId, { date: today, count: 1 });
    } else {
      const userCounter = userMessageCounterMap.get(userId);

      if (userCounter.date !== today) {
        userCounter.date = today;
        userCounter.count = 1;
      } else {
        userCounter.count++;
        if (userCounter.count > 10) {
          await ctx.reply(`Ты превысил лимит 10 сообщений в день! ББ`);
          return;
        }
      }

      userMessageCounterMap.set(userId, userCounter);
    }

    // if (userId === "gr3ek") {
    //   messages.push(`[Voice message from gr3ek]: ${message}`);
    // } else {
    //   messages.push(`[Voice message from ${userId}]: ${message}`);
    // }

    setInterval(() => {
      const today = moment().format("L");

      userMessageCounterMap.forEach((value) => {
        if (value.date !== today) {
          userMessageCounterMap.delete(value);
        }
      });
    }, 86400000);

    await ctx.reply(code("Ща ща, послушаю.."));
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);

    const oggPath = await ogg.create(link.href, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openai.transcription(mp3Path);
    await ctx.reply(code(`Твой запрос:${text}`));

    ctx.session.messages.push({ role: openai.roles.USER, content: text });

    const response = await openai.chat(ctx.session.messages);

    ctx.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response.content,
    });

    await ctx.reply(response.content);
  } catch (e) {
    console.log(`Error while voice message`, e.message);
  }
});

bot.on(message("photo"), async (ctx) => {
  try {
    ctx.reply("Красиво");
  } catch (e) {
    console.log("Error while photo");
  }
});

bot.on(message("sticker"), async (ctx) => {
  try {
    await ctx.reply("ХАХАХА... чо?");
  } catch (e) {
    console.log("Error from sticker");
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
