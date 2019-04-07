import React, { Component } from 'react';

import {
  TouchableOpacity,
  View,
} from "react-native";

import Video from "react-native-video";
import Icon from "react-native-vector-icons/FontAwesome";

class VideoPlayer extends Component {

  state = {
    rate: 1,
    volume: 1,
    muted: false,
    resizeMode: 'contain',
    duration: 0.0,
    currentTime: 0.0,
    paused: true,
  };

  onLoad = (data) => {
    this.setState({ duration: data.duration });
  }

  onProgress = (data) => {
    this.setState({ currentTime: data.currentTime });
  }

  onEnd = () => {
    this.setState({ paused: true });
    this.video.seek(0);
  }


  getCurrentTimePercentage() {
    if (this.state.currentTime > 0) {
      return parseFloat(this.state.currentTime) / parseFloat(this.state.duration);
    }
    return 0;
  };


  render() {
    const flexCompleted = this.getCurrentTimePercentage() * 100;
    const flexRemaining = (1 - this.getCurrentTimePercentage()) * 100;
    const icon = (this.state.paused) ? 'play' : 'pause';

    const { uri } = this.props;

    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.fullScreen}
          onPress={() => this.setState({ paused: !this.state.paused })}
        >
          {
            uri &&
            <Video
              ref={(ref: Video) => { this.video = ref }}
              source={{ uri }}
              style={styles.fullScreen}
              paused={this.state.paused}
              resizeMode={'contain'}
              onLoad={this.onLoad}
              onProgress={this.onProgress}
              onEnd={this.onEnd}
              repeat={false}
            />
          }
        </TouchableOpacity>

        <View style={styles.controls}>
          <Icon name={icon} size={20} color={"#FFF"}  />
          <View style={styles.progress}>
            <View style={[styles.innerProgressCompleted, { flex: flexCompleted }]} />
            <View style={[styles.innerProgressRemaining, { flex: flexRemaining }]} />
          </View>
        </View>
      </View>
    );
  }
}


const styles = {
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000'
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  controls: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 5,
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center'
  },
  progress: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
    marginLeft: 10
  },
  innerProgressCompleted: {
    height: 10,
    backgroundColor: '#f1a91b',
  },
  innerProgressRemaining: {
    height: 10,
    backgroundColor: '#2C2C2C',
  }
}

export default VideoPlayer;