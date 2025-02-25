const prompts = require("prompts");
require("colors");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { spawn } = require("child_process");
const displayHeader = require("./src/banner.js");

displayHeader();

console.log("List Modul AUTO\n");
console.log(`⏩ Uniswap`.red);
console.log(`⏩ Rubic Swap`.red);
console.log(`⏩ Magma Staking`.red);
console.log(`⏩ Izumi Swap`.red);
console.log(`⏩ Kitsu Staking`.red);
console.log(`⏩ aPriori Staking`.red);
console.log(`⏩ Auto Send`.red);
console.log("");

// Replace with your Telegram Bot Token and Chat ID
const TELEGRAM_BOT_TOKEN = 'BOT API';
const TELEGRAM_CHAT_ID = 'Chat ID';

// Global variables to control the bot
let isRunning = false;
let currentProcess = null;
let lastUpdateId = 0;

// Function to send Telegram messages
async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!data.ok) {
      console.error(`❌ Telegram Error: ${data.description}`);
    } else {
      console.log("📬 Telegram notification sent.");
    }
  } catch (error) {
    console.error(`❌ Failed to send Telegram message: ${error.message}`);
  }
}

// List of scripts to run
const scripts = [
  { name: "Uniswap", path: "./modul/uniswap.js" },
  { name: "Rubic Swap", path: "./modul/rubic.js" },
  { name: "Magma Staking", path: "./modul/magma.js" },
  { name: "Izumi Swap", path: "./modul/izumi.js" },
  { name: "Kitsu Staking", path: "./modul/kitsu.js" },
  { name: "aPriori Staking", path: "./modul/apriori.js" },
  { name: "Auto Send", path: "./modul/send.js" },
];

// Run individual script
async function runScript(script) {
  console.log(`\n✅ Running ${script.name}...`);
  await sendTelegramMessage(`🚀 Starting ${script.name}...`);

  return new Promise((resolve, reject) => {
    currentProcess = spawn("node", [script.path]);

    // Capture stdout and send important messages to Telegram
    currentProcess.stdout.on("data", async (data) => {
      const output = data.toString();
      console.log(output);

      if (output.includes("Swap") || output.includes("TXN")) {
        await sendTelegramMessage(`🔄 ${script.name} Output:\n${output}`);
      }
    });

    // Capture stderr for errors
    currentProcess.stderr.on("data", async (data) => {
      const error = data.toString();
      console.error(error);
      await sendTelegramMessage(`❌ Error in ${script.name}:\n${error}`);
    });

    // On script completion
    currentProcess.on("close", async (code) => {
      currentProcess = null; // Clear process after completion

      if (code === 0) {
        console.log(`✅ Finished ${script.name}`);
        await sendTelegramMessage(`✅ Finished ${script.name}`);
        resolve();
      } else {
        console.error(`❌ Error in ${script.name} (Exit code: ${code})`);
        await sendTelegramMessage(`❌ Error in ${script.name} (Exit code: ${code})`);
        reject(new Error(`Script ${script.name} failed`));
      }
    });
  });
}

// Run all scripts sequentially
async function runScriptsSequentially() {
  isRunning = true;
  for (const script of scripts) {
    if (!isRunning) break; // Stop if bot is stopped
    await runScript(script);
  }
  isRunning = false;
  await sendTelegramMessage("🎉 All scripts executed!");
}

// Poll Telegram for commands
async function pollTelegram() {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.ok) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;

        if (update.message && update.message.text) {
          const messageText = update.message.text.trim();

          if (messageText === '/start') {
            if (!isRunning) {
              sendTelegramMessage("🚀 Starting script execution...");
              runScriptsSequentially();
            } else {
              sendTelegramMessage("⚠️ Bot is already running.");
            }
          }

          if (messageText === '/stop') {
            if (isRunning && currentProcess) {
              currentProcess.kill(); // Kill current running process
              isRunning = false;
              sendTelegramMessage("⛔ Bot has been stopped.");
            } else {
              sendTelegramMessage("⚠️ No scripts are currently running.");
            }
          }

          if (messageText === '/status') {
            const statusMsg = isRunning ? "✅ Bot is currently running." : "🛑 Bot is idle.";
            sendTelegramMessage(statusMsg);
          }
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error polling Telegram: ${error.message}`);
  }

  // Continue polling every 3 seconds
  setTimeout(pollTelegram, 3000);
}

// Main function
async function main() {
  console.log("🚀 Starting Telegram Command Polling...");
  await sendTelegramMessage("🤖 Bot is now online! Send /start, /stop, or /status to control it.");
  pollTelegram();
}

main();
