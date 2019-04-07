import React, { Component } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, Alert } from "react-native";
import { GiftedChat, Send, Message } from "react-native-gifted-chat";
import { ChatManager, TokenProvider } from "@pusher/chatkit-client";
import axios from "axios";
import Config from "react-native-config";
import Icon from "react-native-vector-icons/FontAwesome";
import { DocumentPicker, DocumentPickerUtil } from "react-native-document-picker";
import * as mime from "react-native-mime-types";
import Modal from "react-native-modal";
import RNFetchBlob from "rn-fetch-blob";

const Blob = RNFetchBlob.polyfill.Blob;
const fs = RNFetchBlob.fs;
window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest;
window.Blob = Blob;

import RNFS from "react-native-fs";

import ChatBubble from "../components/ChatBubble";
import AudioPlayer from "../components/AudioPlayer";
import VideoPlayer from "../components/VideoPlayer";

const CHATKIT_INSTANCE_LOCATOR_ID = `v1:us1:${Config.CHATKIT_INSTANCE_LOCATOR_ID}`;
const CHATKIT_SECRET_KEY = Config.CHATKIT_SECRET_KEY;

const CHAT_SERVER = "YOUR NGROK HTTPS URL";
const CHATKIT_TOKEN_PROVIDER_ENDPOINT = `${CHAT_SERVER}/auth`;

class Chat extends Component {

  static navigationOptions = ({ navigation }) => {
    const { params } = navigation.state;
    return {
      headerTitle: params.room_name,
      headerRight: (
        <View style={styles.header_right}>
          <TouchableOpacity style={styles.header_button_container} onPress={params.showUsersModal}>
            <View style={styles.header_button}>
              <Text style={styles.header_button_text}>Users</Text>
            </View>
          </TouchableOpacity>
        </View>
      ),
      headerStyle: {
        backgroundColor: "#333"
      },
      headerTitleStyle: {
        color: "#FFF"
      }
    };
  };


  state = {
    company_users: null,
    room_users: null,
    messages: [],
    is_initialized: false,
    is_picking_file: false,
    show_load_earlier: false,

    is_video_modal_visible: false,
    is_last_viewed_message_modal_visible: false,
    is_users_modal_visible: false,

    is_typing: false,
    typing_user: null,

    viewed_user: null,
    viewed_message: null
  };


  constructor(props) {
    super(props);
    const { navigation } = this.props;

    this.user_id = navigation.getParam("user_id");
    this.room_id = navigation.getParam("room_id");
    this.is_room_admin = navigation.getParam("is_room_admin");

    this.modal_types = {
      video: 'is_video_modal_visible',
      last_viewed_message: 'is_last_viewed_message_modal_visible',
      users: 'is_users_modal_visible'
    }
  }


  async componentDidMount() {

    this.props.navigation.setParams({
      showUsersModal: this.showUsersModal
    });

    try {
      const chatManager = new ChatManager({
        instanceLocator: CHATKIT_INSTANCE_LOCATOR_ID,
        userId: this.user_id,
        tokenProvider: new TokenProvider({ url: CHATKIT_TOKEN_PROVIDER_ENDPOINT })
      });

      let currentUser = await chatManager.connect();
      this.currentUser = currentUser;

      await this.currentUser.subscribeToRoomMultipart({
        roomId: this.room_id,
        hooks: {
          onMessage: this.onReceive,
          onUserStartedTyping: this.startTyping,
          onUserStoppedTyping: this.stopTyping
        }
      });

      await this.setState({
        is_initialized: true,
        room_users: this.currentUser.users
      });

    } catch (chat_mgr_err) {
      console.log("error with chat manager: ", chat_mgr_err);
    }
  }

  //

  startTyping = (user) => {
    this.setState({
      is_typing: true,
      typing_user: user.name
    });
  }


  stopTyping = (user) => {
    this.setState({
      is_typing: false,
      typing_user: null
    });
  }


  onReceive = async (data) => {
    this.last_message_id = data.id;
    const { message } = await this.getMessage(data);
    await this.setState((previousState) => ({
      messages: GiftedChat.append(previousState.messages, message)
    }));

    if (this.state.messages.length > 9) {
      this.setState({
        show_load_earlier: true
      });
    }
  }


  onSend = async ([message]) => {
    let message_parts = [
      { type: "text/plain", content: message.text }
    ];

    if (this.attachment) {
      const { file_blob, file_name, file_type } = this.attachment;
      message_parts.push({
        file: file_blob,
        name: file_name,
        type: file_type
      });
    }

    this.setState({
      is_sending: true
    });

    try {
      if (this.last_message_id) {
        const set_cursor_response = await this.currentUser.setReadCursor({
          roomId: this.room_id,
          position: this.last_message_id
        });
      }

      await this.currentUser.sendMultipartMessage({
        roomId: this.room_id,
        parts: message_parts
      });

      this.attachment = null;
      await this.setState({
        is_sending: false
      });
    } catch (send_msg_err) {
      console.log("error sending message: ", send_msg_err);
    }
  }


  renderSend = props => {
    if (this.state.is_sending) {
      return (
        <ActivityIndicator
          size="small"
          color="#0064e1"
          style={[styles.loader, styles.sendLoader]}
        />
      );
    }

    return <Send {...props} />;
  }


  getMessage = async ({ id, sender, parts, createdAt }) => {

    const text = parts.find(part => part.partType === 'inline').payload.content;
    const attachment = parts.find(part => part.partType === 'attachment');

    const attachment_url = (attachment) ? await attachment.payload.url() : null;
    const attachment_type = (attachment) ? attachment.payload.type : null;

    const msg_data = {
      _id: id,
      text: text,
      createdAt: new Date(createdAt),
      user: {
        _id: sender.id,
        name: sender.name,
        avatar: `https://ui-avatars.com/api/?background=d88413&color=FFF&name=${sender.name}`
      }
    };

    if (attachment) {
      Object.assign(msg_data, { attachment: { url: attachment_url, type: attachment_type } });
    }

    if (attachment && attachment_type.indexOf('video') !== -1) {
      Object.assign(msg_data, { video: attachment_url });
    }

    if (attachment && attachment_type.indexOf('image') !== -1) {
      Object.assign(msg_data, { image: attachment_url });
    }

    return {
      message: msg_data
    };
  }


  asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  };


  renderMessage = (msg) => {
    const { attachment } = msg.currentMessage;
    const renderBubble = (attachment && attachment.type.indexOf('audio') !== -1) ? this.renderPreview.bind(this, attachment.url) : null;
    const onLongPress = (attachment  && attachment.type.indexOf('video') !== -1) ? this.onLongPressMessageBubble.bind(this, attachment.url) : null;

    const modified_msg = {
      ...msg,
      renderBubble,
      onLongPress,
      videoProps: {
        paused: true
      }
    }

    return <Message {...modified_msg} />
  }

  //

  onLongPressMessageBubble = (link) => {
    this.setState({
      is_video_modal_visible: true,
      video_uri: link
    });
  }


  renderPreview = (uri, bubbleProps) => {
    const text_color = (bubbleProps.position == 'right') ? '#FFF' : '#000';
    const modified_bubbleProps = {
      ...bubbleProps
    };

    return (
      <ChatBubble {...modified_bubbleProps}>
        <AudioPlayer url={uri} />
      </ChatBubble>
    );
  }

  //

  render() {
    const {
      is_initialized,
      room_users,
      messages,
      video_uri,
      is_video_modal_visible,
      is_last_viewed_message_modal_visible,
      viewed_user,
      viewed_message,
      is_users_modal_visible,
      is_add_user_modal_visible,
      show_load_earlier,
      typing_user
    } = this.state;

    return (
      <View style={styles.container}>
        {(!is_initialized) && (
          <ActivityIndicator
            size="small"
            color="#0064e1"
            style={styles.loader}
          />
        )}

        {is_initialized && (
          <GiftedChat
            messages={messages}
            onSend={messages => this.onSend(messages)}
            user={{
              _id: this.user_id
            }}
            renderActions={this.renderCustomActions}
            renderSend={this.renderSend}
            renderMessage={this.renderMessage}
            onInputTextChanged={this.onTyping}
            renderFooter={this.renderFooter}
            extraData={{ typing_user }}
            onPressAvatar={this.viewLastReadMessage}

            loadEarlier={show_load_earlier}
            onLoadEarlier={this.loadEarlierMessages}
          />
        )}

        <Modal isVisible={is_video_modal_visible}>
          <View style={styles.modal}>
            <TouchableOpacity onPress={this.hideModal.bind(this, 'video')}>
              <Icon name={"close"} size={20} color={"#565656"} style={styles.close} />
            </TouchableOpacity>
            <VideoPlayer uri={video_uri} />
          </View>
        </Modal>

        {
          viewed_user && viewed_message &&
          <Modal isVisible={is_last_viewed_message_modal_visible}>
            <View style={styles.modal}>
              <View style={styles.modal_header}>
                <Text style={styles.modal_header_text}>Last viewed msg: {viewed_user}</Text>
                <TouchableOpacity onPress={this.hideModal.bind(this, 'last_viewed_message')}>
                  <Icon name={"close"} size={20} color={"#565656"} style={styles.close} />
                </TouchableOpacity>
              </View>

              <View style={styles.modal_body}>
                <Text>Message: {viewed_message}</Text>
              </View>
            </View>
          </Modal>
        }

        {
          room_users &&
          <Modal isVisible={is_users_modal_visible}>
            <View style={styles.modal}>
              <View style={styles.modal_header}>
                <Text style={styles.modal_header_text}>Users</Text>
                <TouchableOpacity onPress={this.hideModal.bind(this, 'users')}>
                  <Icon name={"close"} size={20} color={"#565656"} style={styles.close} />
                </TouchableOpacity>
              </View>

              <View style={styles.modal_body}>
                <FlatList
                  keyExtractor={item => item.id.toString()}
                  data={room_users}
                  renderItem={this.renderUser}
                />
              </View>
            </View>
          </Modal>
        }
      </View>
    );
  }

  //

  viewLastReadMessage = async (data) => {
    try {
      const cursor = await this.currentUser.readCursor({
        userId: data.userId,
        roomId: this.room_id
      });

      const viewed_message = this.state.messages.find(msg => msg._id == cursor.position);

      await this.setState({
        viewed_user: data.name,
        is_last_viewed_message_modal_visible: true,
        viewed_message: viewed_message.text ? viewed_message.text : ''
      });
    } catch (view_last_msg_err) {
      console.log("error viewing last message: ", view_last_msg_err);
    }
  }


  showUsersModal = () => {
    this.setState({
      is_users_modal_visible: true
    });
  }

  //

  renderUser = ({ item }) => {
    const online_status = item.presenceStore[item.id];

    return (
      <View style={styles.list_item_body}>
        <View style={styles.list_item}>
          <View style={[styles.status_indicator, styles[online_status]]}></View>
          <Text style={styles.list_item_text}>{item.name}</Text>
        </View>
      </View>
    );
  }

  //

  hideModal = (type) => {
    const modal = this.modal_types[type];
    this.setState({
      [modal]: false
    });
  }


  renderCustomActions = () => {
    if (!this.state.is_picking_file) {
      const icon_color = this.attachment ? "#0064e1" : "#808080";

      return (
        <View style={styles.customActionsContainer}>
          <TouchableOpacity onPress={this.openFilePicker}>
            <View style={styles.buttonContainer}>
              <Icon name="paperclip" size={23} color={icon_color} />
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ActivityIndicator size="small" color="#0064e1" style={styles.loader} />
    );
  }

  //

  openFilePicker = async () => {
    await this.setState({
      is_picking_file: true
    });

    DocumentPicker.show({
      filetype: [DocumentPickerUtil.allFiles()],
    }, async (err, file) => {
      if (!err) {

        try {
          const file_type = mime.contentType(file.fileName);
          const base64 = await RNFS.readFile(file.uri, "base64");

          const file_blob = await Blob.build(base64, { type: `${file_type};BASE64` });

          this.attachment = {
            file_blob: file_blob,
            file_name: file.fileName,
            file_type: file_type
          };

          Alert.alert("Success", "File attached!");

        } catch (attach_err) {
          console.log("error attaching file: ", attach_err);
        }
      }

      this.setState({
        is_picking_file: false
      });
    });
  }


  onTyping = async () => {
    try {
      await this.currentUser.isTypingIn({ roomId: this.room_id });
    } catch (typing_err) {
      console.log("error setting is typing: ", typing_err);
    }
  }


  renderFooter = () => {
    const { is_typing, typing_user } = this.state;
    if (is_typing) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            {typing_user} is typing...
          </Text>
        </View>
      );
    }
    return null;
  }


  loadEarlierMessages = async () => {
    this.setState({
      is_loading: true
    });

    const earliest_message_id = Math.min(
      ...this.state.messages.map(m => parseInt(m._id))
    );

    try {
      let messages = await this.currentUser.fetchMultipartMessages({
        roomId: this.room_id,
        initialId: earliest_message_id,
        direction: "older",
        limit: 10
      });

      if (!messages.length) {
        this.setState({
          show_load_earlier: false
        });
      }

      let earlier_messages = [];
      await this.asyncForEach(messages, async (msg) => {
        let { message } = await this.getMessage(msg);
        earlier_messages.push(message);
      });

      await this.setState(previousState => ({
        messages: previousState.messages.concat(earlier_messages)
      }));
    } catch (err) {
      console.log("error occured while trying to load older messages", err);
    }

    await this.setState({
      is_loading: false
    });
  }

}


const styles = {
  container: {
    flex: 1
  },
  loader: {
    paddingTop: 20
  },

  header_right: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around"
  },

  header_button_container: {
    marginRight: 10
  },
  header_button: {

  },
  header_button_text: {
    color: '#FFF'
  },

  sendLoader: {
    marginRight: 10,
    marginBottom: 10
  },
  customActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  buttonContainer: {
    padding: 10
  },
  modal: {
    flex: 1,
    backgroundColor: '#FFF'
  },
  close: {
    alignSelf: 'flex-end',
    marginBottom: 10
  },
  modal_header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10
  },
  modal_header_text: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  modal_body: {
    marginTop: 20,
    padding: 20
  },
  centered: {
    alignItems: 'center'
  },
  list_item_body: {
    flex: 1,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  list_item: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  list_item_text: {
    marginLeft: 10,
    fontSize: 20,
  },
  status_indicator: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  online: {
    backgroundColor: '#5bb90b'
  },
  offline: {
    backgroundColor: '#606060'
  },

  footerContainer: {
    marginTop: 5,
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 14,
    color: '#aaa',
  }
}

export default Chat;