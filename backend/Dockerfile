FROM python:3.10-slim

# Instalar Java, git y sonar-scanner
RUN apt-get update && apt-get install -y \
    default-jre \
    wget \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Instalar sonar-scanner
RUN wget -q https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip \
    && unzip sonar-scanner-cli-5.0.1.3006-linux.zip -d /opt \
    && ln -s /opt/sonar-scanner-5.0.1.3006-linux/bin/sonar-scanner /usr/local/bin/sonar-scanner \
    && rm sonar-scanner-cli-5.0.1.3006-linux.zip

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]