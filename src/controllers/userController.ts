import { signup } from '../utils/registerUsers';
import { uploadImage } from '../utils/uploadImage';
import { loginUser } from '../utils/loginUser';
import User from '../models/userModel';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const createToken = (_id: any) => {
  return jwt.sign({ _id }, process.env.SECRET, { expiresIn: '3d' });
};

export const getUsers = async (req: any, res: any) => {
  try {
    const users = await User.find({}, { password: 0 });

    res.status(200).json(users);
  } catch (error) {
    res.status(404).json({ msg: 'Users cannot be found' });
  }
};

export const getUserById = async (req: any, res: any) => {
  const { userId } = req.params;
  try {
    const user = await User.findById({ _id: userId }, { password: 0 });

    res.status(200).json(user);
  } catch (error) {
    res.status(404).json({ msg: 'User unknown' });
  }
};

export const registerUser = async (req: any, res: any) => {
  const { username, password, firstName, lastName, image } = req.body;

  try {
    const { imageUrl, imageId } = await uploadImage(image);
    const user = await signup({
      username,
      password,
      firstName,
      lastName,
      imageUrl,
      imageId,
    });

    res.status(200).json({ message: 'Successfully signed up' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req: any, res: any) => {
  try {
    const user = await loginUser(req.body);
    const {
      username,
      firstName,
      lastName,
      imageUrl,
      _id,
      followers,
      following,
    } = user;

    const token = createToken(user._id);

    res.status(200).json({
      token,
      user: {
        username,
        firstName,
        lastName,
        imageUrl,
        _id,
        followers,
        following,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateUserData = async (req: any, res: any) => {
  const { userId } = req.body;

  const loggedUser = await User.findOne({ _id: req.user[0] }, { password: 0 });
  const { username, firstName, lastName, imageUrl, followers, following } =
    await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
    });

  const newUser = {
    _id: userId,
    username,
    firstName,
    lastName,
    imageUrl,
    followers,
    following,
  };

  const user = await User.findOneAndUpdate(
    { _id: req.user[0] },

    {
      $set: {
        following: loggedUser.following.find(({ _id }) => _id === userId)
          ? loggedUser.following.filter(({ _id }) => _id !== userId)
          : [...loggedUser.following, newUser],
      },
    },

    {
      returnOriginal: false,
      password: 0,
    }
  );

  await User.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(userId) },
    {
      $set: {
        followers: followers.find(
          ({ _id }) => _id === req.user[0]._id.toString()
        )
          ? followers.filter(({ _id }) => _id !== req.user[0]._id.toString())
          : [...followers, user],
      },
    },
    { returnOriginal: false }
  );

  if (user) {
    return res.status(200).json({ user, newUser });
  } else {
    return res.status(404).json({ error: 'User unknown' });
  }
};
