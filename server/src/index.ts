import { ApolloServer } from "@apollo/server";
import { createServer } from "http";
import { makeExecutableSchema } from '@graphql-tools/schema';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from "body-parser";
import express from "express";
import cors from "cors";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { PubSub } from "graphql-subscriptions";

interface IMessage {
  id: number;
  user: string;
  content: string;
}

const port = 4000;
const messages: IMessage[] = [];
const pubsub = new PubSub();
let channel: string = Math.random().toString(36).slice(2, 15);

const typeDefs = `
  type Message {
    id: ID!
    user: String!
    content: String!
  }

  type Query {
    messages: [Message!]!
  }

  type Mutation {
    postMessage(user: String!, content: String!): ID!
  }

  type Subscription {
    messages: [Message!]!
  }
`;

const subscribers: (() => void)[] = [];
const onMessagesUpdates = (fn: () => void) => subscribers.push(fn);

const resolvers = {
  Query: {
    messages: () => messages,
  },

  Mutation: {
    postMessage: (parent: any, { user, content }: { user: string, content: string }) => {
      const id = messages.length;
      messages.push({ id, user, content });
      subscribers.forEach((fn) => fn());
      return id;
    }
  },

  Subscription: {
    messages: {
      subscribe: (parent: any, args: any) => {
        channel = Math.random().toString(36).slice(2, 15);
        onMessagesUpdates(() => pubsub.publish(channel, { messages }));
        setTimeout(() => { pubsub.publish(channel, { messages }) }, 0);
        return pubsub.asyncIterator(channel);
      }
    }
  }
}

const schema = makeExecutableSchema({ typeDefs, resolvers });
const app = express();
app.use(cors());
app.use(bodyParser.json());
const httpServer = createServer(app);

// Initializing WebSocket server for subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});
const wsServerCleanup = useServer({ schema }, wsServer);

const apolloServer = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await wsServerCleanup.dispose();
          },
        };
      },
    },
  ],
});

(async function () {
  // Starting the Apollo server
  await apolloServer.start();
  app.use("/graphql", expressMiddleware(apolloServer));
})();

httpServer.listen(port, () => {
  console.log(`🚀 Query endpoint ready at http://localhost:${port}/graphql`);
  console.log(`🚀 Subscription endpoint ready at ws://localhost:${port}/graphql`);
});
