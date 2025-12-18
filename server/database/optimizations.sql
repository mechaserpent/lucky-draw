-- 數據庫性能優化索引
-- 這些索引將大幅提升查詢性能，減少服務器負擔

-- 玩家查詢索引（最常用的查詢模式）
CREATE INDEX IF NOT EXISTS idx_players_room_player ON players(room_id, player_id);
CREATE INDEX IF NOT EXISTS idx_players_room_role ON players(room_id, role);
CREATE INDEX IF NOT EXISTS idx_players_reconnect ON players(room_id, reconnect_token);
CREATE INDEX IF NOT EXISTS idx_players_device ON players(device_id) WHERE device_id IS NOT NULL;

-- 房間查詢索引
CREATE INDEX IF NOT EXISTS idx_rooms_activity ON rooms(last_activity_at, game_state);
CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_rooms_host ON rooms(host_id);

-- 抽獎數據索引
CREATE INDEX IF NOT EXISTS idx_draw_sequences_room ON draw_sequences(room_id);
CREATE INDEX IF NOT EXISTS idx_draw_orders_room ON draw_orders(room_id, order_index);
CREATE INDEX IF NOT EXISTS idx_draw_results_room ON draw_results(room_id, "order");

-- 日誌索引
CREATE INDEX IF NOT EXISTS idx_logs_cleanup ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_room ON logs(room_id, created_at);
