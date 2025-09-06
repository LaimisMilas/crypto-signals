# Database tables

## jobs

- id
- type
- status
- priority
- created_at
- queued_at
- started_at
- finished_at
- progress
- params
- result
- error

## equity_snapshots

- ts
- equity
- source
- created_at

## overlay_sets

- id
- name
- description
- payload
- pinned
- token
- created_at
- updated_at

## overlay_shares

- id
- token
- payload
- created_at

## positions

- ts
- symbol
- position_amt
- entry_price
- unrealized_pnl
- mode
- PRIMARY

## strategy_configs

- id
- active
- updated_at

## strategy_presets

- id
- name
- strategy_id
- params
- symbols
- created_at

## trade_fills

- id
- trade_id
- side
- price
- qty
- commission
- commission_asset
- is_entry
- ts

## job_artifacts

- id
- job_id
- kind
- label
- path
- size_bytes
- created_at

## job_logs

- id
- job_id
- ts
- level
- msg

## risk_limits

- id
- config
- updated_at

## risk_state

- id
- state
- halt_reason
- day_start
- equity_day_start
- equity_day_high
- realized_pnl_today
- updated_at

## risk_halts

- id
- ts
- action
- reason
- details

## equity_history

- ts
- symbol
- strategy
- params
- equity

