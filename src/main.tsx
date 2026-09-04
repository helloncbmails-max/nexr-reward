import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Tab = "home" | "earn" | "tasks" | "refer" | "wallet";

const ads = [
  { title: "Sponsored Video", reward: 25, time: "20 seconds" },
  { title: "Partner Campaign", reward: 35, time: "25 seconds" },
  { title: "Rewarded Placement", reward: 50, time: "30 seconds" }
];

function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [balance, setBalance] = useState(57339);
  const [ad, setAd] = useState(0);
  const [message, setMessage] = useState("");
   
  const [telegramUser, setTelegramUser] = useState<{
  telegram_id: number;
  username: string | null;
  first_name: string | null;
} | null>(null);

const [isVerifying, setIsVerifying] = useState(true);
  
 useEffect(() => {
  async function verifyTelegramUser() {
    try {
      const telegram = (window as any).Telegram?.WebApp;

      if (!telegram) {
        console.log("Nexr opened outside Telegram");
        setIsVerifying(false);
        return;
      }

      telegram.ready();

      if (!telegram.initData) {
        console.log("Telegram authentication data unavailable");
        setIsVerifying(false);
        return;
      }

      const response = await fetch("/api/verify-telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          initData: telegram.initData
        })
      });

      const data = await response.json();

      if (!response.ok || !data.verified) {
        console.error("Telegram verification failed:", data);
        setMessage("Unable to verify Telegram account");
        setIsVerifying(false);
        return;
      }

      setTelegramUser(data.user);
console.log("Verified Nexr user:", data.user);

setMessage("Telegram verified. Syncing Nexr account...");

// Sync verified Telegram user with Nexr database
const syncResponse = await fetch("/api/sync-nexr-user", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    telegram_id: data.user.telegram_id,
    username: data.user.username,
    first_name: data.user.first_name
  })
});

const syncData = await syncResponse.json();

if (!syncResponse.ok || !syncData.success) {
  console.error("Nexr database sync failed:", syncData);
  setMessage("Unable to create Nexr account");
  setIsVerifying(false);
  return;
}

console.log("Nexr account synced:", syncData);

setIsVerifying(false);
    } catch (error) {
      console.error("Telegram connection error:", error);
      setMessage("Telegram connection error");
      setIsVerifying(false);
    }
  }

  verifyTelegramUser();
}, []);

 function watchAd() {
    setMessage("Verifying sponsored ad...");

    setTimeout(() => {
      const reward = ads[ad].reward;

      setBalance((old) => old + reward);
      setAd((old) => (old + 1) % ads.length);
      setMessage(`+${reward} NXR credited`);
    }, 1500);
  }

  function notify(text: string) {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 2500);
  }

  return (
    <div className="app">

      <header className="topbar">
        <div>
          <div className="brand">NEXR</div>
          <div className="subtitle">REWARD NETWORK</div>
        </div>

        <div className="status">● TESTNET</div>
      </header>

      <main>

        {tab === "home" && (
          <>
            <section className="card hero">
              <span className="label">YOUR REWARD BALANCE</span>

              <div className="balance">
                {balance.toLocaleString()} <small>NXR*</small>
              </div>

              <p>Testnet balance</p>

              <div className="actions">
                <button onClick={() => setTab("earn")}>
                  EARN NOW
                </button>

                <button
                  className="secondary"
                  onClick={() => setTab("wallet")}
                >
                  WALLET
                </button>
              </div>
            </section>

            <section className="stats">

              <div className="card stat">
                <strong>12/20</strong>
                <span>Ads today</span>
              </div>

              <div className="card stat">
                <strong>5 days</strong>
                <span>Streak</span>
              </div>

              <div className="card stat">
                <strong>2</strong>
                <span>Referrals</span>
              </div>

            </section>

            <section className="card">

              <div className="sectionHead">
                <h2>NXR MARKET</h2>
                <span>TESTNET</span>
              </div>

              <div className="price">$0.0001</div>

              <div className="chart">
                {[30, 42, 35, 50, 45, 62, 55, 70, 65, 78].map(
                  (height, index) => (
                    <i
                      key={index}
                      style={{ height: `${height}%` }}
                    />
                  )
                )}
              </div>

              <button
                className="secondary full"
                onClick={() =>
                  notify("Live market data will be connected later.")
                }
              >
                VIEW MARKET
              </button>

            </section>
          </>
        )}

        {tab === "earn" && (
          <>
            <div className="pageTitle">
              <span>Earn</span>
              <h1>Watch & Earn</h1>
            </div>

            <section className="card adCard">

              <div className="adIcon">▶</div>

              <div>
                <span className="label">SPONSORED AD</span>
                <h2>{ads[ad].title}</h2>
                <p>{ads[ad].time}</p>
              </div>

              <strong>+{ads[ad].reward} NXR</strong>

              <button onClick={watchAd}>
                WATCH AD
              </button>

            </section>

            <section className="card">

              <div className="sectionHead">
                <h2>Daily activity</h2>
                <span>12 / 20</span>
              </div>

              <div className="progress">
                <i style={{ width: "60%" }} />
              </div>

              <p>
                Sponsored placements become available as advertising
                inventory is received.
              </p>

            </section>

            <section className="card">

              <div className="sectionHead">
                <h2>Daily check-in</h2>
                <span>5 day streak</span>
              </div>

              <div className="days">
                {["D1", "D2", "D3", "D4", "D5", "D6", "D7"].map(
                  (day, index) => (
                    <div key={day}>
                      {day}
                      <b>{index < 5 ? "✓" : `+${10 + index * 10}`}</b>
                    </div>
                  )
                )}
              </div>

            </section>
          </>
        )}

        {tab === "tasks" && (
          <>
            <div className="pageTitle">
              <span>Campaigns</span>
              <h1>Tasks</h1>
            </div>

            {[
              ["Partner Campaign", "Complete a verified promotional action", 250],
              ["Community Campaign", "Join an approved partner community", 150],
              ["Survey Campaign", "Complete a sponsored survey", 400]
            ].map(([title, description, reward]) => (
              <section className="card task" key={String(title)}>

                <div>
                  <span className="label">SPONSORED</span>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>

                <strong>+{reward} NXR</strong>

                <button
                  onClick={() =>
                    notify("Task opened. Verification will happen through the campaign provider.")
                  }
                >
                  OPEN TASK
                </button>

              </section>
            ))}
          </>
        )}

        {tab === "refer" && (
          <>
            <div className="pageTitle">
              <span>Growth</span>
              <h1>Refer & Earn</h1>
            </div>

            <section className="card">

              <span className="label">
                YOUR REFERRAL LINK
              </span>

              <div className="referral">
                t.me/NexrRewardBot/app?startapp=DEMO123
              </div>

              <button
                onClick={() =>
                  notify("Referral link copied.")
                }
              >
                COPY LINK
              </button>

            </section>

            <section className="stats">

              <div className="card stat">
                <strong>2</strong>
                <span>Qualified referrals</span>
              </div>

              <div className="card stat">
                <strong>500</strong>
                <span>NXR earned</span>
              </div>

              <div className="card stat">
                <strong>10%</strong>
                <span>Example rate</span>
              </div>

            </section>
          </>
        )}

        {tab === "wallet" && (
          <>
            <div className="pageTitle">
              <span>Account</span>
              <h1>Wallet</h1>
            </div>

            <section className="card">

              <span className="label">
                TESTNET BALANCE
              </span>

              <div className="balance">
                {balance.toLocaleString()} <small>NXR*</small>
              </div>

              <div className="actions">

                <button
                  onClick={() =>
                    notify("Testnet transfer will be connected later.")
                  }
                >
                  SEND
                </button>

                <button
                  className="secondary"
                  onClick={() =>
                    notify("Testnet receive address will be connected later.")
                  }
                >
                  RECEIVE
                </button>

              </div>

            </section>

            <section className="card">

              <div className="sectionHead">
                <h2>Recent activity</h2>
              </div>

              <div className="ledger">
                <strong>+25 NXR</strong>
                <span>Sponsored ad · verified</span>
              </div>

              <div className="ledger">
                <strong>+250 NXR</strong>
                <span>Partner campaign</span>
              </div>

              <div className="ledger">
                <strong>+100 NXR</strong>
                <span>Daily check-in</span>
              </div>

            </section>
          </>
        )}

      </main>

      {message && (
        <div className="toast">
          {message}
        </div>
      )}

      <nav>

        {(
          [
            ["home", "Home"],
            ["earn", "Earn"],
            ["tasks", "Tasks"],
            ["refer", "Refer"],
            ["wallet", "Wallet"]
          ] as [Tab, string][]
        ).map(([key, label]) => (

          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            <span>
              {key === "home"
                ? "⌂"
                : key === "earn"
                ? "▶"
                : key === "tasks"
                ? "▣"
                : key === "refer"
                ? "↗"
                : "◉"}
            </span>

            {label}

          </button>

        ))}

      </nav>

      <footer>
        * NXR is simulated/testnet data in this prototype and has no monetary value.
      </footer>

    </div>
  );
}

createRoot(
  document.getElementById("root")!
).render(
  <App />
);
