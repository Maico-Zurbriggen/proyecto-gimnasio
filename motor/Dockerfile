FROM python:3.13-slim

WORKDIR /app
COPY motor/pyproject.toml motor/README.md ./
COPY motor/src src
RUN python -m pip install --no-cache-dir .

CMD ["python", "-c", "import gym_engine; print('Motor batch listo')"]
