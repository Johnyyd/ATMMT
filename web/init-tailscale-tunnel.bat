docker exec chat tailscale serve reset
docker exec chat tailscale funnel --bg http://frontend:80

docker exec chat-ts tailscale serve reset
docker exec chat-ts tailscale funnel --bg http://backend:7000
