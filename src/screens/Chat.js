import React, { Component } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, Alert } from "react-native";
import { GiftedChat, Send } from "react-native-gifted-chat";
import { ChatManager, TokenProvider } from "@pusher/chatkit-client";
import axios from "axios";
import Config from "react-native-config";
import Icon from "react-native-vector-icons/FontAwesome";

const CHATKIT_INSTANCE_LOCATOR_ID = `v1:us1:${Config.CHATKIT_INSTANCE_LOCATOR_ID}`;
const CHATKIT_SECRET_KEY = Config.CHATKIT_SECRET_KEY;

const CHAT_SERVER = "YOUR NGROK HTTPS URL";
const CHATKIT_TOKEN_PROVIDER_ENDPOINT = `${CHAT_SERVER}/auth`;

class Chat extends Component {

  static navigationOptions = ({ navigation }) => {
    const { params } = navigation.state;
    return {
      headerTitle: params.room_name,
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
    show_load_earlier: false
  }


  constructor(props) {
    super(props);
    const { navigation } = this.props;

    this.user_id = navigation.getParam("user_id");
    this.room_id = navigation.getParam("room_id");
  }


  async componentDidMount() {

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
          onMessage: this.onReceive
        }
      });

      await this.setState({
        is_initialized: true
      });

    } catch (chat_mgr_err) {
      console.log("error with chat manager: ", chat_mgr_err);
    }
  }

  //

  onReceive = async (data) => {
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
    this.setState({
      is_sending: true
    });

    try {
      await this.currentUser.sendSimpleMessage({
        roomId: this.room_id,
        text: message.text,
      });

      this.setState({
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

    return {
      message: msg_data
    };
  }


  asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  };

  //

  render() {
    const {
      is_initialized,
      messages,
      show_load_earlier
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

            loadEarlier={show_load_earlier}
            onLoadEarlier={this.loadEarlierMessages}
          />
        )}
      </View>
    );
  }

  //

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
