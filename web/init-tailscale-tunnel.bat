docker exec chat tailscale serve reset
docker exec chat tailscale funnel --bg http://frontend:8080

docker exec chat_ts tailscale serve reset
docker exec chat_ts tailscale funnel --bg http://backend:7000

