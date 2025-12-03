  CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
