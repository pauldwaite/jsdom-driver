FROM node:18-alpine

WORKDIR /workdir

COPY src/package.json ./
COPY src/package-lock.json ./

RUN npm ci --no-optional --loglevel error

COPY ./src .
COPY ./README.md .

CMD ["npm", "test"]
