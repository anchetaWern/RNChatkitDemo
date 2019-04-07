import React, { Component } from "react";
import { View, Text, FlatList, Button } from "react-native";
import axios from "axios";

const CHAT_SERVER = "YOUR NGROK HTTPS URL";

class Groups extends Component {
  static navigationOptions = {
    title: "Groups"
  };

  state = {
    rooms: []
  };


  constructor(props) {
    super(props);
    const { navigation } = this.props;
    this.user_id = navigation.getParam("id");
  }

  //

  async componentDidMount() {
    try {
      const response = await axios.post(`${CHAT_SERVER}/rooms`, { user_id: this.user_id });
      const { rooms } = response.data;

      this.setState({
        rooms
      });
    } catch (get_rooms_err) {
      console.log("error getting rooms: ", get_rooms_err);
    }
  }


  render() {
    const { rooms } = this.state;

    return (
      <View style={styles.container}>
        {
          rooms &&
          <FlatList
            keyExtractor={(item) => item.id.toString()}
            data={rooms}
            renderItem={this.renderRoom}
          />
        }
      </View>

    );
  }

  //

  renderRoom = ({ item }) => {
    return (
      <View style={styles.list_item}>
        <Text style={styles.list_item_text}>{item.name}</Text>
        <Button title="Enter" color="#0064e1" onPress={() => {
          this.enterChat(item);
        }} />
      </View>
    );
  }

  //

  enterChat = async (room) => {
    try {
      const response = await axios.post(`${CHAT_SERVER}/user/permissions`, { room_id: room.id, user_id: this.user_id });
      const { permissions } = response.data;
      const is_room_admin = (permissions.indexOf('room:members:add') !== -1);

      this.props.navigation.navigate("Chat", {
        user_id: this.user_id,
        room_id: room.id,
        room_name: room.name,
        is_room_admin
      });

    } catch (get_permissions_err) {
      console.log("error getting permissions: ", get_permissions_err);
    }
  }
}

export default Groups;

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#FFF"
  },
  list_item: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  list_item_text: {
    marginLeft: 10,
    fontSize: 20,
  }
};