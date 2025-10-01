const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
module.exports = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: {
        renderer: './src/renderer/app.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.js',
        clean: true
    },
    target: 'electron-renderer',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg)$/,
                type: 'asset/resource'
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',
            filename: 'index.html',
            inject: 'body'
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'assets',
                    to: 'assets'
                },
                {
                    from: 'node_modules/bootstrap/dist/css/bootstrap.min.css',
                    to: 'css/bootstrap.min.css'
                },
                {
                    from: 'node_modules/@fortawesome/fontawesome-free/css/all.min.css',
                    to: 'css/fontawesome.min.css'
                }
            ]
        })
    ],
    resolve: {
        extensions: ['.js', '.json'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@renderer': path.resolve(__dirname, 'src/renderer'),
            '@main': path.resolve(__dirname, 'src/main')
        }
    },
    devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false,
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all'
                }
            }
        }
    }
};
