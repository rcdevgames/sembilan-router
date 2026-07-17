docker stop sembilan-router
docker rm sembilan-router
docker build -t sembilan-router .
docker run -d --name sembilan-router -p 20128:20128 --env-file .env -v sembilan-router-data:/app/data sembilan-router