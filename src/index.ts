import * as WebSocket from 'ws'
import { parse } from '@deepstream/protobuf/dist/src/message-parser'
import { getMessage } from '@deepstream/protobuf/dist/src/message-builder'
import { TOPIC, CONNECTION_ACTION, AUTH_ACTION, EVENT_ACTION } from '@deepstream/protobuf/dist/types/all'

class Client {
    private socket: WebSocket;
    constructor (private url: string) {
        this.socket = new WebSocket(this.url)
        this.socket.onopen = this.onOpen.bind(this)
        this.socket.onmessage = this.onMessage.bind(this)
        this.socket.onerror = (e) => {
            console.error(e)
            process.exit(1)
        }
    }

    onOpen () {
        console.log('Sending a challenge')
        this.sendMessage({
            topic: TOPIC.CONNECTION,
            action: CONNECTION_ACTION.CHALLENGE,
            url: this.url,
            protocolVersion: '0.1a'
        })

        setInterval(() => {
            this.sendMessage({
                topic: TOPIC.CONNECTION,
                action: CONNECTION_ACTION.PING
            })
        }, 5000)
    }
    
    onMessage (raw: any) {
        const message = parse(raw.data)[0] as any
        if (message.topic === TOPIC.CONNECTION && message.action === CONNECTION_ACTION.ACCEPT) {
            console.log('logging in')
            this.sendMessage({
                topic: TOPIC.AUTH,
                action: AUTH_ACTION.REQUEST,
                data: JSON.stringify({})
            })
        }
        if (message.topic === TOPIC.AUTH && message.action === AUTH_ACTION.AUTH_SUCCESSFUL) {
            console.log('subscribing to event')
            this.sendMessage({
                topic: TOPIC.EVENT,
                action: EVENT_ACTION.SUBSCRIBE,
                names: ['an-event']
            })

            setInterval(() => {
                this.sendMessage({
                    topic: TOPIC.EVENT,
                    action: EVENT_ACTION.EMIT,
                    name: 'an-event',
                    data: JSON.stringify({ payload: 'HEY!', value: Math.random() })
                })
            }, 2000)
        }
        if (message.topic === TOPIC.EVENT) {
            if (message.isAck) {
                console.log('got a subscribe ack')
            }
            else if (message.action === EVENT_ACTION.EMIT) {
                console.log('got an event', message.name, 'with payload', message.data)
            } 
        }
    }

    sendMessage (message: any) {
        this.socket.send(getMessage(message, false))
    }
}

new Client('ws://localhost:6020')