import React from 'react';
import './footer.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub, faLinkedin, faInstagram } from '@fortawesome/free-brands-svg-icons';

const Footer = () => {
    return (
        // <div className="footer" style={{backgroundImage: `url(${bg})`}}>
        //     <div className="footer__content container">
        //         <div className="footer__content__logo">
        //             <div className="logo">
        //                 <img src={logo} alt="" />
        //                 <Link to="/">tMovies</Link>
        //             </div>
        //         </div>
        //         <div className="footer__content__menus">
        //             <div className="footer__content__menu">
        //                 <Link to="/">Home</Link>
        //                 <Link to="/">Contact us</Link>
        //                 <Link to="/">Term of services</Link>
        //                 <Link to="/">About us</Link>
        //             </div>
        //             <div className="footer__content__menu">
        //                 <Link to="/">Live</Link>
        //                 <Link to="/">FAQ</Link>
        //                 <Link to="/">Premium</Link>
        //                 <Link to="/">Pravacy policy</Link>
        //             </div>
        //             <div className="footer__content__menu">
        //                 <Link to="/">You must watch</Link>
        //                 <Link to="/">Recent release</Link>
        //                 <Link to="/">Top IMDB</Link>
        //             </div>
        //         </div>
        //     </div>
        // </div>
        <footer className="footer">
            <div className="footer__social-icons">
                <a href="https://github.com/vanshaj-pahwa" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faGithub} />
                </a>
                <a href="https://linkedin.com/in/vanshaj-pahwa" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faLinkedin} />
                </a>
                <a href="https://instagram.com/vanshaj.pahwa" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faInstagram} />
                </a>
            </div>
            <div className="footer__credit">
                Developed by <a href="https://github.com/vanshaj-pahwa" target="_blank" rel="noopener noreferrer">Vanshaj Pahwa</a>
            </div>
        </footer>
    );
}

export default Footer;