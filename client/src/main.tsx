import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { ApolloClient, InMemoryCache, ApolloProvider, split, HttpLink } from '@apollo/client';


// HTTP connection to the API
const httpLink = new HttpLink({
  uri: 'http://localhost:4000/', // Replace with your HTTP endpoint
});

// WebSocket connection to the API
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/', // Replace with your WebSocket endpoint
  })
);

// Split the links based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);
