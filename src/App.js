/* src/App.js */
import React, { useEffect, useState, useRef, PubSub } from 'react';
import Amplify, { API, graphqlOperation } from 'aws-amplify';
import { createMessage, createStatus, updateStatus } from './graphql/mutations';
import { listMessages, listStatuses } from './graphql/queries';
import { messageSorted } from './graphql/customQueries';

import {onCreateMessage, onUpdateStatus} from './graphql/subscriptions';

import {AmplifyAuthenticator, AmplifySignIn} from '@aws-amplify/ui-react'
import {AuthState, onAuthUIStateChange} from "@aws-amplify/ui-components"


import awsExports from "./aws-exports";


Amplify.configure(awsExports);



const App = () => {
  const [authState, setAuthState] = useState();
  const [user, setUser] = useState();

 
  const ViewBottom = () => {
    const bottomRef = useRef();
    useEffect(() => bottomRef.current.scrollIntoView());
    return <div ref={bottomRef}/>
  }

  useEffect(() => {
    fetchMessages();
    fetchStatus();
    statusHeartBeat();
    onAuthUIStateChange((nextAuthState, authData) => {
      setAuthState(nextAuthState);
      setUser(authData);
      
    });
    
  }, [])



  const initialState = { user: '', message: '' }

  const [formState, setFormState] = useState([])
  const [messages, setMessages] = useState([])
  const [statuses, setStatus] = useState([])

  async function fetchStatus() {
    try {
      const statusData = await API.graphql(graphqlOperation(listStatuses))
      const statuses = statusData.data.listStatuses.items
      setStatus(statuses)
      statusHeartBeat();
    } catch (err) { console.log(err) }
  }

  function setInput(key, value) {

    setFormState({ [key]: value, ['user']: user.username, ['type']: "message"})
    statusHeartBeat();
  }

  async function fetchMessages() {
    try {
      const messageData = await API.graphql(graphqlOperation(messageSorted))
      const messages = messageData.data.messageSorted.items
      setMessages(messages)
    } catch (err) { console.log('error loading message') }
  }
  async function sendMessage() {
    try {
      if (!formState.message ) return
      const message = { ...formState }
      setMessages([...messages, message])
      setFormState(initialState)
      statusHeartBeat();
      await API.graphql(graphqlOperation(createMessage, {input: message}))
    } catch (err) {
      console.log('error sending message:', err)
    }
  }

  const msgSubscription = API.graphql(graphqlOperation(onCreateMessage)
  ).subscribe({
    next: (data) => {
      fetchMessages();
    },
    error: error => console.warn(error)
  });
  /*
  const statusSubscription = API.graphql(graphqlOperation(onUpdateStatus)
  ).subscribe({
    next: (data) => {
      fetchStatus();
    },
    error: error => console.warn(error)
  });*/

async function statusHeartBeat(){
  try{
    await API.graphql(graphqlOperation(updateStatus, {input: {id: user.username}}))
  } catch (err) {
    console.log('error updating status:', err)
  }
  
}

function getCurrentTime(){
 var currentTime = new Date();
 currentTime.setMinutes(currentTime.getMinutes() - 5) 

 return currentTime.toISOString();

}

  //subscription.unsubscribe();

  return authState === AuthState.SignedIn && user ? (
    
    <div style={styles.container}>
      <p>Chat:</p>
      <p>Welcome <b>{user.username}</b> !</p>
      
      <div style={styles.statusDiv}>

      {statuses.map((status, index) => (
        <div key={status.id ? status.id : index}>

              {status.id === user.username
              ? <div></div> // Do not display anything for own user status
              : [
                  status.updatedAt > getCurrentTime()
                      ? <span><span style={styles.active}>{status.id} </span>Active</span>
                      : <span><span style={styles.inactive}>{status.id} </span>Not Active</span>
              ]
          }
        </div>

      ))}
        

        </div>
      <div style={styles.chatbox}>
      {
        messages.map((message, index) => (
          <div key={message.id ? message.id : index} style={styles.message}>
            { message.user === user.username ? (
              <p style={styles.THISuser}><span style={styles.space}></span>{message.user} (ME)</p>
            ) : (
              <p style={styles.OTHERuser}><span style={styles.space}></span>{message.user}</p>
            )}
            <p style={styles.messageBody}>{message.message}</p>

          </div>
        ))
      }
      <ViewBottom/>
      </div>
      <hr style={{borderColor: "#000000", height: .5, width: "100%"} }/>
      

      <input
        onChange={event => setInput('message', event.target.value, 'user', user)}
        style={styles.input}
        value={formState.name}
        placeholder="Message"
      />

    <button style={styles.button} onClick={sendMessage}>Send</button>
      
    </div>

    ) : (
      <AmplifyAuthenticator>
      <AmplifySignIn slot="sign-in" hideSignUp>
  
      </AmplifySignIn>
      </AmplifyAuthenticator>
  )
}

const styles = {
  container: { width: 400, border: '1px solid black', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20},
  chatbox: { width: "99%", border: '1px solid grey', overflow: "scroll", height: 500},
  statusDiv: {position: 'relative'},
  space: {display: "block", width: 20, right: 40},
  message: {  margin: 5, border: "1px solid rgba(0,0,255, 0.2)", borderRadius: 5, padding: 2},
  input: { border: 'none', backgroundColor: '#ddd', marginBottom: 10, padding: 8, fontSize: 18, width: "50%", float: "left" },
  THISuser: { fontSize: 15, fontWeight: 'bold', color: "red", marginBottom: -15, marginTop: 0 },
  OTHERuser: { fontSize: 15, fontWeight: 'bold', color: "blue", marginBottom: -15, marginTop: 0 },
  messageBody: { marginBottom: 0, marginTop: 15},
  button: { backgroundColor: 'blue', color: 'white', outline: 'none', fontSize: 18, padding: '6px 0px', width: "15%", height: 40, float: "right"},
  active: { backgroundColor: 'green', textAlign: 'center', display: 'inline-block', width: 25, height:25, borderRadius: 12},
  inactive: { backgroundColor: 'red', textAlign: 'center', display: 'inline-block', width: 25, height:25, borderRadius: 12}
}

export default App;