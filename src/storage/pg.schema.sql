
CREATE TABLE IF NOT EXISTS candles
(
    id
    INTEGER
    PRIMARY
    KEY,
    ts
    INTEGER
    NOT
    NULL,
    open
    REAL,
    high
    REAL,
    low
    REAL,
    close
    REAL,
    volume
    REAL,
    UNIQUE
(
    ts
)
    );

CREATE TABLE IF NOT EXISTS signals
(
    id
    INTEGER
    PRIMARY
    KEY,
    ts
    INTEGER
    NOT
    NULL,
    type
    TEXT
    CHECK (
    type
    IN
(
    'BUY',
    'SELL'
)) NOT NULL,
    price REAL NOT NULL,
    rsi REAL,
    atr REAL,
    aroon_up REAL,
    aroon_down REAL,
    reason TEXT
    );

CREATE TABLE IF NOT EXISTS subscribers
(
    id
    INTEGER
    PRIMARY
    KEY,
    email
    TEXT,
    subscription_id
    TEXT,
    status
    TEXT, -- active, trialing, canceled, past_due, unpaid
    created_at
    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_candles_ts ON candles(ts);
CREATE INDEX IF NOT EXISTS idx_signals_ts ON signals(ts);
CREATE INDEX IF NOT EXISTS idx_subs_subscription ON subscribers(subscription_id);
