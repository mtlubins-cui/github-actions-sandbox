FROM node:12

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN apt-get update
RUN apt-get -y install git
RUN apt-get -y install git-flow

ENV GIT_MERGE_AUTOEDIT=no

RUN npm install -g conventional-changelog-cli
RUN npm ci --only=production


# Copy the rest of your action's code
COPY . .

# Run `node /index.js`
ENTRYPOINT ["node", "/index.js"]
