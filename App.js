import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, Image, Alert, Modal, TouchableHighlight, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Permissions from 'expo-permissions';

export default function App() {

  const [pickedImage, setPickedImage] = useState();

  const [modalVisible, setModalVisible] = useState(false);

  const [empId, setEmpId] = useState();

  const [name, setName] = useState();

  const [statusMsg, setStatusMsg] = useState();

  const [imageIcon, setImageIcon] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [borderColor, setBorderColor] = useState(false);



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
      aspect: [16, 9],
      quality: 0.3 //ranges between 0-1 
    });
    setPickedImage(image.uri);

  };

  const submitImage = async () => {

    const data = new FormData();

    data.append('image', { uri: pickedImage, type: "image/jpg", name: "image" });
    if (pickedImage != null) {
      setIsLoading(true);
      const res = await fetch('https://api.edgeneural.ai/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        body: data,
      }).then(
        response => response.json()
      ).then(
        success => {
          const result = success.prediction[0].faceid;
          if (result != null) {
            setEmpId(success.prediction[0].faceid.empId);
            setName(success.prediction[0].faceid.fname + ' ' + success.prediction[0].faceid.lname)
            setStatusMsg('Found');
            setImageIcon(true);
            setIsLoading(false);
            setBorderColor(true);
            setModalVisible(true);
          } else {
            setStatusMsg('Not Found');
            setEmpId('-');
            setName('-')
            setPickedImage();
            setImageIcon(false);
            setIsLoading(false);
            setModalVisible(true);
          }

        }

      ).catch(
        error => console.log(error)
      );

    } else {
      alert('Please Select File first');
    }
  };
  return (
    <View style={styles.container} >

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Alert.alert("Modal has been closed.");
        }}
      >

        <View style={styles.modalView}>
          <Text style={styles.modalText}>{statusMsg}</Text>
          {!imageIcon ? (
            <Image style={styles.imageIcon} source={require('./assets/cancel.png')} />
          ) : (
              <Image style={styles.imageIcon} source={require('./assets/check.png')} />
            )}

          {!borderColor ? (
            <View style={{ ...styles.ImageModal, borderColor: '#FF0000' }}>
              <Image style={styles.image} source={{ uri: pickedImage }} />
            </View>
          ) : (
              <View style={{ ...styles.ImageModal, borderColor: '#008000' }}>
                <Image style={styles.image} source={{ uri: pickedImage }} />
              </View>
            )}


          <Text style={styles.modalText}>Employee ID: {empId}</Text>
          <Text style={styles.modalText}>Name: {name}</Text>


          <TouchableHighlight
            style={{ ...styles.openButton, backgroundColor: "#2196F3" }}
            onPress={() => {
              setModalVisible(!modalVisible);
              setPickedImage();
            }}
          >
            <Text style={styles.textStyle}>Close</Text>
          </TouchableHighlight>
        </View>

      </Modal>

      <View style={styles.imagePreview}>
        {!pickedImage ? (
          <Text style={styles.modalText}>No image picked yet.</Text>
        ) : (
            <Image style={styles.image} source={{ uri: pickedImage }} />
          )}
      </View>


      <View style={{ flexDirection: 'row', flex: 1, marginTop: 10 }} >
        <View >
          <TouchableOpacity onPress={() => { takeImageHandler() }}>
            <Image style={{ marginRight: 50 }} source={require("./assets/photo-camera.png")} />
          </TouchableOpacity>
        </View>
        <View >
          {!pickedImage ? (
            <TouchableOpacity>
              <Image style={styles.button1} source={require("./assets/right-arrow.png")} />
            </TouchableOpacity>
          ) : (
              <TouchableOpacity onPress={() => { submitImage() }}>
                <Image style={styles.button1} source={require("./assets/right-arrow.png")} />
              </TouchableOpacity>
            )}
        </View>
        <View style={{ justifyContent: "center", alignItems: "center" }}>
          {isLoading && <ActivityIndicator color={"#000"} />}
        </View>
      </View>



    </View>
  );
}

const styles = StyleSheet.create({
  buton1: {
    height: 10,
    width: 10
  },
  imagePreview: {
    width: '100%',
    height: 200,
    marginBottom: 10,
    justifyContent: 'center',
    borderColor: '#ccc',
    borderWidth: 1
  },
  imageIcon: {
    width: 100,
    height: 100,
    marginBottom: 20
  },
  image: {
    width: '100%',
    height: '100%',
    marginBottom: 10
  },
  container: {
    paddingTop: '50%',
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  openButton: {
    backgroundColor: "#F194FF",
    borderRadius: 20,
    padding: 10,
    elevation: 2
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  ImageModal: {
    height: "50%",
    width: "100%",
    marginBottom: 10,
    borderWidth: 4
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center"
  }
});
