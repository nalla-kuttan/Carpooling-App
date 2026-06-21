import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, share } from "rxjs";
import { io } from "socket.io-client";
import { AuthService } from "src/app/auth.service";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class MessageService {
  public messages$: BehaviorSubject<{ [key: string]: any } | null> =
    new BehaviorSubject<{ [key: string]: any } | null>(null);
  messages: string[] = [];
  room_id: any;
  isSubscribed = false;
  socket = io(environment.userAPIBase.replace(/\/api\/?$/, ""));

  constructor(private _http: HttpClient, private authService: AuthService) {
    this.socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
      this.socket.on("userJoined", (userId) => {
        console.log(`User ${userId} has joined the group chat`);
        // Handle user join logic, such as updating the user interface
      });
      this.socket.on("chatStarted", (chatRoomId) => {
        console.log(`Chat started with chat room ID: ${chatRoomId}`);
        // Handle chat initiation logic, such as updating the user interface
      });
      this.socket.on("userLeft", (userId) => {
        console.log(`User ${userId} has left the group chat`);
        // Handle user leave logic, such as updating the user interface
      });
    });
  }
  createRoom(roomId: string) {
    console.log("join room for chat ", roomId);

    // console.log("user id :", userId, "ride id :", rideId);
    // const body = { rideId, userId }
    // this.socket.emit("joinRoom", roomId);
    this.socket.emit("joinGroupChat", roomId);
  }
  leaveRoom(roomId: string) {
    console.log("leave room ", roomId);

    this.socket.emit("leaveGroupChat", roomId);
  }
  registerUser(userId: string) {
    console.log("user id :", userId);
    this.socket.emit("register", userId);
  }
  SendMessage(body: any) {
    // console.log("body send ", body)
    const { rideId, message, senderName, senderId, roomId } = body;
    this.SendMessageByApi({ message, senderId, roomId })
      ?.then((res) => {
        console.log("message res", res);
      })
      .catch((err) => console.log(err));
    this.socket.emit("groupChatMessage", body);
  }

  createPrivateRooms(senderId: any) {
    this.socket.emit("startChat", senderId);
  }
  sendMessagePrivate(body: any) {
    const { senderId, receiverId, message, roomId } = body;
    this.socket.emit("singleChatMessage", body);

    this.SendMessageByApi({ senderId, message, roomId })
      ?.then((res) => {
        console.log("private message", res);
      })
      .catch((err) => console.log("error private ", err));
  }

  getMessage() {
    if (!this.isSubscribed) {
      this.isSubscribed = true;
      this.socket.on("incomingMessage", (message: any) => {
        console.log("messages get: ", message);
        // this.messages.push(message);
        return this.messages$.next(message);
      });
    }
    // this.socket.on('incomingMessage', (message: any) => {
    //   console.log("messages get: ", message);
    //   // this.messages.push(message);
    //   this.messages$.next(message);
    // });
  }

  async getRideDetails(rideId: string): Promise<any> {
    const token = this.authService.getToken();
    if (token) {
      const headers = { Authorization: `JWT ${token}` };
      return this._http
        .get<{ message: String; _users: [] }>(
          `${environment.userAPIBase}/ridedetails/${rideId}`,
          { headers }
        )
        .toPromise();
    }
    return;
  }

  async getUsersList(): Promise<any> {
    const token = this.authService.getToken();
    if (token) {
      const headers = { Authorization: `JWT ${token}` };
      return this._http
        .get<{ message: String; _users: [] }>(
          `${environment.userAPIBase}/users`,
          { headers }
        )
        .toPromise();
    }
    return;
  }

  async createRoomById(userId: string) {
    const token = this.authService.getToken();
    if (token) {
      const headers = { Authorization: `JWT ${token}` };
      return this._http
        .post<{ message: String; _room: [] }>(
          `${environment.userAPIBase}/room`,
          { userId },
          { headers }
        )
        .toPromise();
    }
    return;
  }

  async createRoomByApi(rideId: string, userId: string) {
    const token = this.authService.getToken();
    if (token) {
      const headers = { Authorization: `JWT ${token}` };
      return this._http
        .post<{ message: String; _room: [] }>(
          `${environment.userAPIBase}/room`,
          { rideId, userId },
          { headers }
        )
        .toPromise();
    }
    return;
  }

  SendMessageByApi(body: any) {
    const token = this.authService.getToken();
    if (token) {
      const headers = { Authorization: `JWT ${token}` };
      return this._http
        .post<{ message: String; __messages: [] }>(
          `${environment.userAPIBase}/message`,
          body,
          { headers }
        )
        .toPromise();
    }
    return;
  }

  async getRoomHistory(roomId: string): Promise<any> {
    const token = this.authService.getToken();
    if (token) {
      const headers = { Authorization: `JWT ${token}` };
      return this._http
        .get<{ message: String; _message: [] }>(
          `${environment.userAPIBase}/message/${roomId}`,
          { headers }
        )
        .toPromise();
    }
    return;
  }

  async getRoomDetails(senderId: string, receiverId: string): Promise<any> {
    const token = this.authService.getToken();
    if (token) {
      const headers = { Authorization: `JWT ${token}` };
      return this._http
        .post<{ message: String; _room: [] }>(
          `${environment.userAPIBase}/room/detailByMembers`,
          { senderId, receiverId },
          { headers }
        )
        .toPromise();
    }
    return;
  }

  // in future you want to see details of room
  async getRoomList(): Promise<any> {
    const token = this.authService.getToken();
    if (token) {
      const headers = { Authorization: `JWT ${token}` };
      return this._http
        .get<{ message: String; _room: [] }>(
          `${environment.userAPIBase}/room/list`,
          { headers }
        )
        .toPromise();
    }
    return;
  }

  removeUserSocket() {
    this.socket.emit("endChat");
  }
}
