FROM node:24-alpine AS development

WORKDIR /workspace

COPY package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install

COPY tsconfig.base.json eslint.config.mjs ./
COPY apps/backend apps/backend
COPY packages/contracts packages/contracts

EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace=@gym/backend"]
