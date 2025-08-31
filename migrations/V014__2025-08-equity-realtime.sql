-- Ensure fast filters
CREATE INDEX IF NOT EXISTS idx_paper_trades_closed_at ON paper_trades (closed_at);
CREATE INDEX IF NOT EXISTS idx_paper_trades_status ON paper_trades (status);

-- Notification function
CREATE OR REPLACE FUNCTION notify_equity_update() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('equity_update', COALESCE(NEW.symbol,'') || '|' || COALESCE(NEW.strategy,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on CLOSED trades
DROP TRIGGER IF EXISTS trg_equity_update ON paper_trades;
CREATE TRIGGER trg_equity_update
AFTER INSERT OR UPDATE OF status ON paper_trades
FOR EACH ROW
WHEN (NEW.status = 'CLOSED')
EXECUTE FUNCTION notify_equity_update();
