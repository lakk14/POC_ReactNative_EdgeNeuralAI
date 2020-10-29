import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, Alert, Modal, TouchableHighlight, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';

//create component instead function 
export default function App() {


  //Add import { withNavigation } from 'react-navigation';


  // static navigationOptions = ({navigation}) => {
  // 	const { params = {} } = navigation.state;
  // 	return{
  // 		title: "FaceRec",
  // 		headerStyle: {
  // 		  backgroundColor: '#0177bc'
  // 		},
  // 		headerTitleStyle: {
  // 			fontSize: 18
  // 		},
  // 		headerTintColor: '#fff',
  // 		headerLeft: () => null,
  // 		headerRight: () => (
  // 			<Icon
  // 				name='power-off'
  // 				type="font-awesome"
  // 				onPress={() => params.logout() }
  // 				size={25}
  // 				color = '#fff'
  // 				underlayColor= '#0177bc'
  // 				iconStyle={{ padding: 15 }}
  // 			/>
  // 		)
  // 	}
  // }


  // _logout = async() => {
  // 		await AsyncStorage.removeItem('isLoggedIn');
  // 		this.props.navigation.navigate('Auth');
  // }
  // componentDidMount() {
  // 	const { navigation } = this.props
  // 	navigation.setParams({
  // 		logout: this._logout
  // 	})
  // }





  const [pickedImage, setPickedImage] = useState();

  const [modalVisible, setModalVisible] = useState(false);

  const [empId, setEmpId] = useState();

  const [name, setName] = useState();

  const [statusMsg, setStatusMsg] = useState();

  const [cLocation, setClocation] = useState();

  const [imageIcon, setImageIcon] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [borderColor, setBorderColor] = useState(false);


  //remove this fn
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
  //remove fn
  const verifyLPermissions = async () => {
    const result = await Permissions.askAsync(Permissions.CAMERA, Permissions.LOCATION);
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

  const getLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({ timeInterval: 3000 });
      setClocation(location);
    }
    catch (e) {
      Alert.alert('Could not fectch location!', 'Please try again', [{ text: "Ok" }]);
    }
  }

  const submitImage = async () => {

    getLocation();
    console.log(cLocation);
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
          if (success.status_code == 200) {

            var imgCount = 0;
            var empIds = '';
            var names = '';
            var coordinatesGreen = [];
            var coordinatesRed = [];

            success.prediction.map(key => {
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

              const hasLPermission = verifyLPermissions();
              if (!hasLPermission) {
                return;
              }

              let ts = new Date(cLocation.timestamp).toISOString().replace(/T/, ' ').replace(/\..+/, '');

              data.append('trans', '{"txnId": 21, "dvcId": 14224190209830000603, "dvcIp": "127.0.0.1", "punchId": "2", "txnDateTime": "' + ts + '", "mode": "IN", "clientId": "2", "location": {"latitude": "' + cLocation.coords.latitude + '", "longitude":"' + cLocation.coords.longitude + '"}}');
              console.log(data);
              const locRes = fetch('https://attendance.edgeneural.ai/payroll-attendance/api/public/index.php/api/transaction_new', {
                method: 'POST',
                headers: {
                  'Content-Type': 'multipart/form-data',
                  'Accept': 'application/json'
                },
                body: data,
              }).then(
                response => response.json()
              ).then(
                success => { console.log(success) }
              ).catch(
                error => console.log(error)
              );

              setEmpId(empIds);
              setName(names);
              setImageIcon(true);
              setBorderColor(true);
              setStatusMsg('Found');
            } else {
              setEmpId('-');
              setName('-');
              setBorderColor(false);
              setImageIcon(false);
              setStatusMsg('Not Found');
            }
            setIsLoading(false);
            setModalVisible(true);

          } else if (success.status_code == 104) {
            setStatusMsg(success.error);
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

//refer container style from enrollment

//container and container1 from login
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
