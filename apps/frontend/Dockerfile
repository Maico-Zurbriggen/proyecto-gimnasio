FROM node:24-alpine AS development

WORKDIR /workspace

COPY package.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install

COPY tsconfig.base.json eslint.config.mjs ./
COPY apps/frontend apps/frontend
COPY packages/contracts packages/contracts

EXPOSE 5173
CMD ["npm", "run", "dev", "--workspace=@gym/frontend"]
