"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_1 = require("apollo-server");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const messages = [];
const pubsub = new graphql_subscriptions_1.PubSub();
let channel = Math.random().toString(36).slice(2, 15);
const typeDefs = (0, apollo_server_1.gql) `
    type Message{
        id:ID!
        user:String!
        content:String!
    }

    type Query{
        messages:[Message!]!
    }

    type Mutation{
        postMessage(user:String!,content:String!):ID!
    }

    type Subscription{
        messages:[Message!]!
    }
`;
const subscribers = [];
const onMessagesUpdates = (fn) => subscribers.push(fn);
const resolvers = {
    Query: {
        messages: () => messages,
    },
    Mutation: {
        postMessage: (parent, { user, content }) => {
            const id = content.length;
            messages.push({ id, user, content });
            subscribers.forEach((fn) => fn());
            return id;
        }
    },
    Subscription: {
        messages: {
            subscribe: (0, graphql_subscriptions_1.withFilter)(() => pubsub.asyncIterator(channel), (parent, args) => {
                channel = Math.random().toString(36).slice(2, 15);
                onMessagesUpdates(() => pubsub.publish(channel, { messages }));
                setTimeout(() => { pubsub.publish(channel, { messages }); }, 0);
                return true;
            })
        }
    }
};
const server = new apollo_server_1.ApolloServer({ typeDefs, resolvers });
server.listen().then(({ url }) => {
    console.log(`Server ready at ${url}`);
});
