import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Permissions from 'expo-permissions';

export default function App() {

  const [pickedImage, setPickedImage] = useState();

  const verifyPermissions = async () => {
    const result = await Permissions.askAsync(Permissions.CAMERA, Permissions.CAMERA_ROLL);
    if (result.status !== 'granted') {
      Alert.alert('Insufficient permissions!',
        'You need to grant camera permissions to use this app.',
        [{ text: 'Ok' }]
      );
      return false;
    }
    return true;
  };
  const takeImageHandler = async () => {
    const hasPermission = await verifyPermissions();
    if (!hasPermission) {
      return;
    }
    const image = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 16],
      quality: 0.5 //ranges between 0-1 
    });
    setPickedImage(image.uri);
  };

  const submitImage = async () => {
    const data = new FormData();
    data.append('name', 'image');
    data.append('file_attachment', pickedImage);

    if (pickedImage != null) {
      let res = await fetch('https://api.edgeneural.ai/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: data,
      });
      let responseJson = await res.json();
      if (responseJson.status == 1) {
        alert('Upload Successful');
        console.log(res);
      }

    } else {
      alert('Please Select File first');
    }
  };
  return (
    <View style={styles.container} >
      <View style={styles.imagePreview}>
        {!pickedImage ? (
          <Text>No image picked yet.</Text>
        ) : (
            <Image style={styles.image} source={{ uri: pickedImage }} />
          )}
      </View>
      <Button
        title="Take Image"
        color="blue"
        onPress={takeImageHandler}
      />

      <Button
        title="Submit"
        color="green"
        onPress={submitImage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  imagePreview: {
    width: '100%',
    height: 200,
    marginBottom: 10,
    justifyContent: 'center',
    borderColor: '#ccc',
    borderWidth: 1
  },
  image: {
    width: '100%',
    height: '100%'
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
