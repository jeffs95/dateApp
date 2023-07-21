import React, { useState, useEffect } from 'react';
import { Button, Text, View, AppRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';
import moment from 'moment';

const db = SQLite.openDatabase(
  {
    name: 'fechKingo.db',
    location: 'default',
  },
  () => {},
  error => {
    console.error('Error opening database', error);
  }
);

const App = () => {
  const [storedDate, setStoredDate] = useState<string | undefined>(undefined);
  const [asyncStorageDate, setAsyncStorageDate] = useState<string | undefined>(undefined);
  const [sqliteDate, setSqliteDate] = useState<string | undefined>(undefined);

  useEffect(() => { 
    retrieveStoredDateFromAsyncStorage();
    retrieveStoredDateFromSQLite();
  }, []);

useEffect(() => {
  if (asyncStorageDate) {
    validateAndIncrementDate(asyncStorageDate);
  }
}, [asyncStorageDate]);

  const createTable = () => {
    db.transaction(tx => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS Fecha (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT)',
        [],
        () => {
        },
        error => {
          console.error('Error creando la tabla', error);
        }
      );
    });
  };

  const retrieveStoredDateFromSQLite = async () => {
    createTable(); 
    const sqliteDate = await retrieveDateFromSQLite();
    if (sqliteDate) {
      console.log('Fecha almacenada en SQLite:', sqliteDate);
      console.log("AsyncStorage in the cosnt retrive", asyncStorageDate)
      setStoredDate(sqliteDate);
      setSqliteDate(sqliteDate);
      validateAndIncrementDate(sqliteDate);
    }
  };

  const retrieveDateFromSQLite = () => {
    return new Promise<string | undefined>((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM Fecha',
          [],
          (_, resultSet) => {
            const rows = resultSet.rows;
            if (rows.length > 0) {
              const date = rows.item(0).date;
              resolve(date);
            } else {
              resolve(undefined);
            }
          },
          error => {
            reject(error);
          }
        );
      });
    });
  };

  const updateAsyncStorageDate = async (date: string) => {
    try {
      await AsyncStorage.setItem('storedDate', date);
      setAsyncStorageDate(date);
    } catch (error) {
      console.error('Error actualizando la fecha en AsyncStorage', error);
    }
  };

  const retrieveStoredDateFromAsyncStorage = async () => {
    try {
      const storedDate = await AsyncStorage.getItem('storedDate');
      if (storedDate !== null) {
        console.log('Fecha que se vincula con AsyncStorage:', storedDate);
        setStoredDate(storedDate);
        setAsyncStorageDate(storedDate);
        validateAndIncrementDate(storedDate); // Llama a validateAndIncrementDate con el valor actualizado
      } else {
        createTable(); // Crear tabla si no existe
        const sqliteDate = await retrieveDateFromSQLite(); // Obtener fecha del SQLite
        if (sqliteDate) {
          await AsyncStorage.setItem('storedDate', sqliteDate);
          setStoredDate(sqliteDate);
          setAsyncStorageDate(sqliteDate);
          validateAndIncrementDate(sqliteDate); // Llama a validateAndIncrementDate con el valor actualizado
        }
      }
    } catch (error) {
      console.error('Error retrieving date from AsyncStorage', error);
    }
  };
  
  const validateAndIncrementDate = async (date: string) => {
    const currentDate = moment().format('YYYY-MM-DD');
    const diffInDays = moment(currentDate).diff(date, 'days');
    const currentAsyncStorageDate = moment(asyncStorageDate).format('YYYY-MM-DD');

    if (moment(currentDate).isBefore(date)) {
      if (!moment(currentDate).isSame(currentAsyncStorageDate)) {
        await updateAsyncStorageDate(currentDate);
        console.log("Asyng", currentAsyncStorageDate, "current", currentDate)
        const incrementedDate = moment(date).add(1, 'days').format('YYYY-MM-DD');
        updateDateInSQLite(incrementedDate);
        await updateAsyncStorageDate(currentDate);
      } else {
        await updateAsyncStorageDate(currentDate);
      }
    } else if (diffInDays <= 7) {
      if (!moment(currentDate).isSame(currentAsyncStorageDate)) {
          updateDateInSQLite(currentDate);
          await updateAsyncStorageDate(currentDate);
          console.log("AsyncStorage", currentAsyncStorageDate)
      } else {
        await updateAsyncStorageDate(currentDate);
      }
    } else {
      const incrementedDate = moment(date).add(1, 'days').format('YYYY-MM-DD');
      if (!moment(currentDate).isSame(currentAsyncStorageDate)) {
        await updateAsyncStorageDate(currentDate);
        updateDateInSQLite(incrementedDate);
        console.log("Incrementacion de 1 dia")
        console.log("AsyngStorage incrementacion", asyncStorageDate)
      } else {
        await updateAsyncStorageDate(currentDate);
      }
    }
  };

  const updateDateInSQLite = (date: string) => {
    if (asyncStorageDate !== moment().format('YYYY-MM-DD')) {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE Fecha SET date = ?',
          [date],
          () => {
            setSqliteDate(date);
          },
          error => {
            console.error('Error updating date in SQLite', error);
          }
        );
      });
    }
  };

  const saveDateToAsyncStorage = async (date: string) => {
    try {
      await AsyncStorage.setItem('storedDate', date);
      console.log('Fecha del celular (AsyncStorage):', date);
      setStoredDate(date);
      setAsyncStorageDate(date);
    } catch (error) {
      console.error('Error saving date to AsyncStorage', error);
    }
  };

  const saveDateToSQLite = () => {
    const currentDate = moment().format('YYYY-MM-DD');
    db.transaction(tx => {
      tx.executeSql(
        'INSERT OR REPLACE INTO Fecha (id, date) VALUES (?, ?)',
        [1, currentDate],
        () => {
          console.log('Fecha insertada o actualizada en SQLite');
          saveDateToAsyncStorage(currentDate);
          retrieveStoredDateFromSQLite(); // Actualizar fecha en pantalla
        },
        error => {
          console.error('Error inserting or updating date in SQLite', error);
        }
      );
    });
  };

  const showAllRecords = () => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM Fecha',
        [],
        (_, resultSet) => {
          const rows = resultSet.rows;
          for (let i = 0; i < rows.length; i++) {
            console.log(`Registro ${i + 1}: ${rows.item(i).date}`);
          }
        },
        error => {
          console.error('No se pueden mostrar los registros', error);
        }
      );
    });
  };

  const currentDate = moment().format('YYYY-MM-DD');
  return (
    <View>
      <Button title="Guardar Fecha" onPress={saveDateToSQLite} />
      <Button title="Mostrar Registros" onPress={showAllRecords} />
      <Text>Fecha Segura (AsyncStorage): {asyncStorageDate}</Text>
      <Text>Fecha Segura (SQLite): {sqliteDate}</Text>
      <Text>Fecha Segura (Teléfono): {currentDate }</Text>
      <Text>Si es la primera vez que entra, GUARDAR LA FECHA</Text>
    </View>
  );
};

export default App;
