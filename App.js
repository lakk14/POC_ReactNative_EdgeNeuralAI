import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, Alert, Modal, TouchableHighlight, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
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

  const verifyLPermissions = async () => {
    const result = await Permissions.askAsync(Permissions.LOCATION);
    if (result.status !== 'granted') {
      Alert.alert('Insufficient permissions!',
        'You need to grant location permissions to use this app.',
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
      allowsEditing: false,
      aspect: [16, 9],
      quality: 0.3 //ranges between 0-1 
    });
    setPickedImage(image.uri);
  };

  const transaction = (data) => {
    return new Promise(function (resolve, reject) {

      let response = fetch('https://attendance.edgeneural.ai/payroll-attendance/api/public/index.php/api/transaction_new', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        body: data,
      }).then((response) => response.json())
        .then((responseJson) => {
          resolve(responseJson);
        })
        .catch((error) => {
          reject(error);
        });

    });
  }

  const faceRec = (data) => {
    return new Promise(function (resolve, reject) {

      data.append('image', { uri: pickedImage, type: "image/jpg", name: "image" });

      let response = fetch('https://api.edgeneural.ai/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        body: data,
      }).then(
        response => response.json()
      ).then((success) => {
        resolve(success);
      }).catch((error) => {
        reject(error);
      });

    });
  }

  const submitImage = async () => {

    if (pickedImage != null) {
      setIsLoading(true);

      const data = new FormData();

      data.append('image', { uri: pickedImage, type: "image/jpg", name: "image" });

      //Calling FaceRec API
      var responseJson = await faceRec(data).catch((error) => {
        console.log(responseJson);
        console.log(error);
        Alert.alert('FaceRec Failed :(', 'Please try again', [{ text: "Ok" }]);
      });

      if (responseJson != undefined && responseJson != null && responseJson['status_code'] == 200) {

        var imgCount = 0;
        var empIds = '';
        var names = '';
        var coordinatesGreen = [];
        var coordinatesRed = [];

        responseJson.prediction.map(key => {
          if (key.confidence != null) {
            if (key.confidence > 0.7) {
              if (empIds != '' && names != '') {
                empIds = empIds + ', ' + key.faceid.empId;
                names = names + ', ' + key.faceid.fname + ' ' + key.faceid.lname
              } else {
                empIds = empIds + key.faceid.empId;
                names = names + key.faceid.fname + ' ' + key.faceid.lname
              }
              imgCount++;

              coordinatesGreen.push(key.face_coordinates);
            }
          } else {
            imgCount = 0;
            coordinatesRed.push(key.face_coordinates);
          }
        });

        if (imgCount >= 1) {
          setEmpId(empIds);
          setName(names);
          setImageIcon(true);
          setBorderColor(true);
          setStatusMsg('Found');

          //Checking Location Permission
          const hasLPermission = verifyLPermissions();
          if (!hasLPermission) {
            return;
          }

          //Getting Location for transaction
          try {
            const location = await Location.getCurrentPositionAsync({ timeout: 5000 });

            let ts = new Date(location.timestamp).toISOString().replace(/T/, ' ').replace(/\..+/, '');

            data.append('trans', '{"txnId": 21, "dvcId": 14224190209830000603, "dvcIp": "127.0.0.1", "punchId": "' + empId + '", "txnDateTime": "2020-07-10 09:38:18", "mode": "IN", "clientId": "2","location":{"lat":"' + location.coords.latitude + '","lng":"' + location.coords.longitude + '"}}');

          }
          catch (e) {
            Alert.alert('Could not fectch location!', 'Please try again', [{ text: "Ok" }]);
          }

          //Calling Transaction API
          var tresponseJson = await transaction(data).catch((error) => {
            Alert.alert('Transaction Failed :(', 'Please try again', [{ text: "Ok" }]);
          });

        } else {
          setEmpId('-');
          setName('-');
          setBorderColor(false);
          setImageIcon(false);
          setStatusMsg('Not Found');
        }

        setIsLoading(false);
        setModalVisible(true);
      } else if (responseJson != undefined && responseJson != null && responseJson['status_code'] == 104) {
        setStatusMsg(responseJson['error']);
        setEmpId('-');
        setName('-');
        setPickedImage();
        setImageIcon(false);
        setBorderColor(false);
        setIsLoading(false);
        setModalVisible(true);
      } else {
        setStatusMsg("Something went wrong, try again!");
        setEmpId('-');
        setName('-');
        setPickedImage();
        setImageIcon(false);
        setBorderColor(false);
        setIsLoading(false);
        setModalVisible(true);
      }

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

          {borderColor ? (
            <View style={{ ...styles.ImageModal, borderColor: '#008000' }}>
              <Image style={styles.image} source={{ uri: pickedImage }} />
              <Text style={styles.modalText}>Employee ID: {empId}</Text>
              <Text style={styles.modalText}>Name: {name}</Text>
            </View>
          ) : (
              <View style={{
                ...styles.ImageModal, borderColor: '#FF0000'
              }}>
                <Image style={styles.image} source={{ uri: pickedImage }} />
              </View>
            )}

          <TouchableHighlight
            style={{ ...styles.openButton, backgroundColor: "#2196F3",marginTop:'20%' }}
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
