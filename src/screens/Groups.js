import React, { Component } from "react";
import { View, Text, TouchableOpacity, FlatList, Button } from "react-native";
import axios from "axios";

const CHAT_SERVER = "YOUR NGROK HTTPS URL";

class Groups extends Component {
  static navigationOptions = {
    title: "Groups"
  };

  render() {
    return (
      <View>
        <Text>Group Screen</Text>
      </View>
    );
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