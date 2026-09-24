docker exec chat-portfolio tailscale serve reset
docker exec chat-portfolio tailscale funnel --bg http://frontend:8080

docker exec chat-portfolio-backend tailscale serve reset
docker exec chat-portfolio-backend tailscale funnel --bg http://backend:7000
