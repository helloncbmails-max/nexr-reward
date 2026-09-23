import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Tab = "home" | "earn" | "tasks" | "refer" | "wallet";
 type RewardTransaction = {
  id: string;
  amount: number | string;
  transaction_type: string;
  description: string;
  status: string;
  created_at: string;
};
type Task = {
  id: string;
  title: string;
  description: string;
  reward: number | string;
  status: string;
  link: string;
  created_at: string;
  completion_status: "available" | "pending" | "completed";
};
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
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
const [tasks, setTasks] = useState<Task[]>([]);
const [isLoadingTasks, setIsLoadingTasks] = useState(false);
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
        setMessage("Telegram WebApp was not detected");
        setIsVerifying(false);
        return;
      }

      telegram.ready();

      if (!telegram.initData) {
        console.log("Telegram authentication data unavailable");
        setMessage("Telegram authentication data is unavailable");
        setIsVerifying(false);
        return;
      }

      // Step 1: Verify Telegram identity
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

        setMessage(
          data.error || "Unable to verify Telegram account"
        );

        setIsVerifying(false);
        return;
      }

      setTelegramUser(data.user);

      console.log("Verified Nexr user:", data.user);

      // Step 2: Sync account and load balance
      let accountLoaded = false;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(
            `Nexr account startup attempt ${attempt}/3`
          );

          setMessage(
            attempt === 1
              ? "Telegram verified. Syncing Nexr account..."
              : `Syncing Nexr account... (retry ${attempt}/3)`
          );

          // Sync verified Telegram user with Nexr database
          const syncResponse = await fetch("/api/sync-nexr-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              initData: telegram.initData
            })
          });

          const syncData = await syncResponse.json();

          console.log("Nexr sync response:", syncData);

          if (!syncResponse.ok || !syncData.success) {
            throw new Error(
              syncData.error || "Unable to sync Nexr account"
            );
          }

          console.log("Nexr account synced:", syncData);

          // Load the real Nexr account and balance
          const accountResponse = await fetch(
            "/api/get-nexr-account",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                initData: telegram.initData
              })
            }
          );

          const accountData = await accountResponse.json();

          console.log(
            "Nexr account response:",
            accountData
          );

          if (!accountResponse.ok || !accountData.success) {
            throw new Error(
              accountData.error ||
                "Unable to load Nexr account"
            );
          }

          // Load the real balance from Supabase
          setBalance(accountData.balance);

          console.log(
            "Nexr account loaded:",
            accountData
          );

          accountLoaded = true;

          setMessage(
            "Nexr account successfully updated!"
          );

          setTimeout(() => {
            setMessage("");
          }, 3000);

          break;
        } catch (error) {
          console.error(
            `Nexr account startup attempt ${attempt} failed:`,
            error
          );

          if (attempt < 3) {
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * attempt)
            );
          }
        }
      }

      if (!accountLoaded) {
        setMessage(
          "Unable to sync Nexr account. Please try opening the Mini App again."
        );
      }

      setIsVerifying(false);
    } catch (error) {
      console.error("Telegram connection error:", error);

      setMessage("Telegram connection error");
      setIsVerifying(false);
    }
  }

  verifyTelegramUser();
}, []);

useEffect(() => {
  if (tab !== "wallet") {
    return;
  }

  async function loadRewardHistory() {
    try {
      setIsLoadingTransactions(true);

      const initData = window.Telegram?.WebApp?.initData;

      if (!initData) {
        console.error("Telegram session unavailable");
        return;
      }

      const response = await fetch("/api/get-reward-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initData,
        }),
      });

      const data = await response.json();

      console.log("Reward history response:", data);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to load reward history"
        );
      }

      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Reward history error:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }

  loadRewardHistory();
}, [tab]);

useEffect(() => {
  if (tab !== "tasks") {
    return;
  }

  async function loadTasks() {
    try {
      setIsLoadingTasks(true);

      const initData = window.Telegram?.WebApp?.initData;

      if (!initData) {
        console.error("Telegram session unavailable");
        return;
      }

      const response = await fetch("/api/get-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initData,
        }),
      });

      const data = await response.json();

      console.log("Tasks response:", data);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to load tasks"
        );
      }

      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Tasks loading error:", error);
    } finally {
      setIsLoadingTasks(false);
    }
  }

  loadTasks();
}, [tab]);

async function watchAd() {
  setMessage("Creating secure ad session...");

  try {
    const initData = window.Telegram?.WebApp?.initData;

    if (!initData) {
      setMessage("Telegram session not available.");
      return;
    }

    const response = await fetch("/api/create-ad-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ initData }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Unable to create ad event");
    }

    const ymid = data.tracking_id;

    if (!ymid) {
      throw new Error("Ad tracking ID was not returned");
    }

    const showAd = (window as any).show_11741797;

    if (typeof showAd !== "function") {
      throw new Error("Monetag ad SDK is not available");
    }

    setMessage("Loading sponsored ad...");

    const result = await showAd({
      type: "end",
      ymid,
      requestVar: "watch_ad",
    });

console.log("Monetag ad result:", result);

if (result?.reward_event_type === "valued") {
  setMessage("Ad verified. Checking reward...");

  let approved = false;

  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const statusResponse = await fetch("/api/ad-reward-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData,
        tracking_id: ymid,
      }),
    });

    const statusData = await statusResponse.json();

    console.log("Ad reward status:", statusData);

    if (statusResponse.ok && statusData.status === "approved") {
      approved = true;

      const accountResponse = await fetch("/api/get-nexr-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initData,
        }),
      });

      const accountData = await accountResponse.json();

      if (accountResponse.ok && accountData.success) {
        setBalance(accountData.balance);
      }

      setMessage(`Reward approved. +${statusData.reward} NXR credited.`);

      setTimeout(() => {
        setMessage("");
      }, 3000);

      break;
    }

    if (statusResponse.ok && statusData.status === "processing") {
      setMessage("Ad verified. Reward is being processed...");
    }
  }

  if (!approved) {
    setMessage("Ad verified. Reward is still processing.");
  }
} else {
  setMessage("Ad completed, but no monetized reward was confirmed.");
}

setAd((old) => (old + 1) % ads.length);
  } catch (error) {
    console.error("Ad event error:", error);
    setMessage("Unable to start sponsored ad.");
  }
}
  
async function startTask(
  taskId: string,
  campaignLink: string
) {
  setMessage("Starting task...");

  try {
    const initData =
      window.Telegram?.WebApp?.initData;

    if (!initData) {
      setMessage("Telegram session not available.");
      return;
    }

    const response = await fetch("/api/start-task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData,
        task_id: taskId,
      }),
    });

    const data = await response.json();

    console.log("Start task response:", data);

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Unable to start task"
      );
    }

if (data.already_started) {
  setMessage(
    "You have already started this task. Opening campaign..."
  );
} else {
  setMessage(
    "Task started. Opening campaign..."
  );
}

const telegram = (window as any).Telegram?.WebApp;

if (telegram?.openTelegramLink) {
  telegram.openTelegramLink(campaignLink);
} else {
  window.open(campaignLink, "_blank");
}
setTimeout(() => {
  setMessage("");
}, 3000);
  
} catch (error) {
    console.error(
      "Start task error:",
      error
    );

    setMessage(
      error instanceof Error
        ? error.message
        : "Unable to start task."
    );
  }
}

async function verifyTask(taskId: string) {
  setMessage("Verifying task...");

  try {
    const initData =
      window.Telegram?.WebApp?.initData;

    if (!initData) {
      setMessage("Telegram session not available.");
      return;
    }

    const response = await fetch("/api/verify-task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData,
        task_id: taskId,
      }),
    });

    const data = await response.json();

    console.log("Verify task response:", data);

    if (!response.ok) {
      throw new Error(
        data.error || "Unable to verify task"
      );
    }

    if (data.status === "approved") {
      const rewardAmount = Number(data.reward_amount || 0);

      if (rewardAmount > 0) {
        setMessage(
          `Task verified successfully! +${rewardAmount} NXR`
        );
      } else {
        setMessage(
          data.message || "Task verified successfully!"
        );
      }

      // Refresh the authoritative NXR balance
      try {
        const accountResponse = await fetch(
          "/api/get-nexr-account",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              initData,
            }),
          }
        );

        const accountData = await accountResponse.json();

        console.log(
          "Updated account after task reward:",
          accountData
        );

        if (
          accountResponse.ok &&
          accountData.success
        ) {
          setBalance(
            Number(accountData.balance || 0)
          );
        }
      } catch (balanceError) {
        console.error(
          "Balance refresh failed:",
          balanceError
        );
      }

      setTimeout(() => {
        setMessage("");
      }, 4000);

      return;
    }

    setMessage(
      data.message ||
      "Please join the NEXR community first."
    );

  } catch (error) {
    console.error(
      "Verify task error:",
      error
    );

    setMessage(
      error instanceof Error
        ? error.message
        : "Unable to verify task."
    );
  }
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

    {isLoadingTasks ? (
      <section className="card">
        <div className="emptyState">
          Loading available tasks...
        </div>
      </section>
    ) : tasks.length === 0 ? (
      <section className="card">
        <div className="emptyState">
          No tasks are available right now.
        </div>
      </section>
    ) : (
      tasks.map((task) => {
        const reward = Number(task.reward);

        return (
          <section
            className="card task"
            key={task.id}
          >
            <div>
              <span className="label">
                SPONSORED
              </span>

              <h2>{task.title}</h2>

              <p>{task.description}</p>
            </div>

            <strong>
              +{reward.toLocaleString()} NXR
            </strong>

<div className="taskActions">
  <button
    onClick={() => startTask(task.id, task.link)}
  >
    OPEN TASK
  </button>

  <button
    className="secondary"
    onClick={() => verifyTask(task.id)}
  >
    VERIFY
  </button>
</div>
          </section>
        );
      })
    )}
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

    {isLoadingTransactions ? (

      <div className="emptyState">
        Loading reward history...
      </div>

    ) : transactions.length === 0 ? (

      <div className="emptyState">
        No reward activity yet.
      </div>

    ) : (

      transactions.map((transaction) => {

        const amount = Number(transaction.amount);

        const isPositive = amount > 0;

        return (

          <div
            className="ledgerRow"
            key={transaction.id}
          >

            <div>

              <strong>
                {transaction.description}
              </strong>

              <span>
                {new Date(
                  transaction.created_at
                ).toLocaleString()}
              </span>

            </div>

            <strong
              className={
                isPositive
                  ? "positive"
                  : "negative"
              }
            >

              {isPositive ? "+" : ""}

              {amount.toLocaleString()} NXR

            </strong>

          </div>

        );

      })

    )}

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
